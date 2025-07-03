import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { BreedSpecies } from '../pets/entities/breed-species.entity';
import { Breed } from '../pets/entities/breed.entity';
import { HumanOwner } from '@modules/human-owners/entities/human-owner.entity';
import { AuditLog } from '@modules/audit-logs/entities/audit-log.entity';
import { Document } from '@modules/documents/entities/document.entity';
import { DocumentsService } from '@modules/documents/documents.service';
import { VaccinesService } from '@modules/vaccines/vaccines.service';
import { Status } from '@shared/enums/status.enum';
import { DocumentType } from '@shared/enums/document-type.enum';
import { openaiClient, openaiModel } from '../../config/openai.config';
import * as pdfParse from 'pdf-parse';
import * as path from 'path';
import { Express } from 'express';
import { retry } from 'ts-retry-promise';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHash } from 'crypto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';
import { ChatCompletion, ChatCompletionChunk } from 'openai/resources';
import { Stream } from 'openai/streaming';

@Injectable()
export class UserPetService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_FILES = 10;
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    @InjectRepository(PetProfile)
    private petRepository: Repository<PetProfile>,
    @InjectRepository(BreedSpecies)
    private breedSpeciesRepository: Repository<BreedSpecies>,
    @InjectRepository(Breed)
    private breedRepository: Repository<Breed>,
    @InjectRepository(HumanOwner)
    private humanOwnerRepository: Repository<HumanOwner>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private documentsService: DocumentsService,
    private vaccinesService: VaccinesService,
    @InjectQueue('document-processing') private documentQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async createPetFromDocuments(
    files: Express.Multer.File[],
    user: any,
    ipAddress: string,
    userAgent: string,
  ) {
    // Input validation
    if (files.length > this.MAX_FILES) {
      throw new BadRequestException(`Maximum ${this.MAX_FILES} files allowed`);
    }
    for (const file of files) {
      if (file.size > this.MAX_FILE_SIZE) {
        throw new BadRequestException(`File ${file.originalname} exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      }
      // Validate file properties
      if (!file.buffer || !Buffer.isBuffer(file.buffer) || !file.originalname || !file.mimetype) {
        console.error('File validation failed before queuing:', {
          originalname: file?.originalname || 'unknown',
          hasBuffer: !!file?.buffer,
          isBuffer: Buffer.isBuffer(file?.buffer),
          bufferSize: file?.buffer?.length,
          mimetype: file?.mimetype,
        });
        throw new BadRequestException(`Invalid file: ${file?.originalname || 'unknown'} is missing buffer, originalname, or mimetype`);
      }
    }

    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can create pets');
    }

    const humanOwner = await this.humanOwnerRepository.findOne({ where: { id: user.id, status: Status.Active }, select: ['id'] });
    if (!humanOwner) {
      throw new NotFoundException('Human owner not found');
    }

    // Fetch "Other" species and breed from Redis or DB
    const [otherSpecies, otherBreed] = await Promise.all([
      this.getCachedOrFetch('species:other', () =>
        this.breedSpeciesRepository.findOneOrFail({ where: { species_name: 'Other', status: Status.Active } }),
      ),
      this.getCachedOrFetch('breed:other', () =>
        this.breedRepository.findOneOrFail({ where: { breed_name: 'Other', status: Status.Active } }),
      ),
    ]);

    // Extract pet and vaccine information from documents
    const { petInfo, vaccineDataList } = await this.analyzeDocumentsForPetInfo(files);
    const { pet_name, species, breed, age, weight, dob, color, microchip, spay_neuter } = petInfo;

    // Map species and breed with caching
    let breedSpecies = otherSpecies;
    if (species) {
      const foundSpecies = await this.getCachedOrFetch(`species:${species}`, () =>
        this.breedSpeciesRepository.findOne({ where: { species_name: species, status: Status.Active } }),
      );
      if (foundSpecies) {
        breedSpecies = foundSpecies;
      }
    }

    let breedEntity: Breed | null = otherBreed;
    if (breed && breedSpecies.id !== otherSpecies.id) {
      const foundBreed = await this.getCachedOrFetch(`breed:${breed}:${breedSpecies.id}`, () =>
        this.breedRepository.findOne({
          where: { breed_name: breed, breed_species: { id: breedSpecies.id }, status: Status.Active },
        }),
      );
      if (foundBreed) {
        breedEntity = foundBreed;
      }
    }

    let code: string;
    try {
      code = await this.getNextPetCode();
    } catch (error) {
      console.error('Error generating pet code:', error);
      code = 'AAAAA'; // Fallback to default code
    }

    // Create pet profile
    const petData = {
      pet_name: pet_name || `Pet-${Date.now()}`,
      human_owner: humanOwner,
      breed_species: breedSpecies,
      breed: breedEntity,
      age: age || null,
      weight: weight || null,
      dob: dob ? new Date(dob) : null,
      color: color || null,
      microchip: microchip || null,
      spay_neuter: spay_neuter || null,
      location: null,
      latitude: null,
      longitude: null,
      notes: null,
      status: Status.Active,
      qr_code_id: code,
    };

    const pet = this.petRepository.create(petData);
    const savedPet = await this.petRepository.save(pet);

    // Convert file buffers to base64 for Bull queue serialization
    const queueFiles = files.map(file => ({
      originalname: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer.toString('base64'),
    }));

    // Add document processing to Bull queue
    const job = await this.documentQueue.add('process-documents', {
      files: queueFiles,
      petId: savedPet.id,
      user,
      ipAddress,
      userAgent,
      vaccineDataList,
    });

    // Log pet creation
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'PetProfile',
        entity_id: savedPet.id,
        action: 'Create',
        changes: { ...petData, human_owner_id: user.id },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return {
      message: 'Pet created, document processing queued',
      pet: savedPet,
      jobId: job.id,
    };
  }

  async processDocumentsJob(data: {
    files: Array<{ originalname: string; mimetype: string; buffer: string }>;
    petId: number;
    user: any;
    ipAddress: string;
    userAgent: string;
    vaccineDataList: Array<{
      isVaccine: boolean;
      vaccines: Array<{
        vaccine_name: string | null;
        date_administered: string | null;
        expiry_date: string | null;
        administered_by: string | null;
      }>;
    }>;
  }) {
    const { files, petId, user, ipAddress, userAgent, vaccineDataList } = data;
    const results = [];
    const auditLogs: AuditLog[] = [];
    const allowedFileTypes = ['pdf', 'jpg', 'jpeg', 'png'];

    // Validate vaccineDataList length
    if (vaccineDataList.length !== files.length) {
      console.warn('Mismatch in vaccineDataList length, padding with defaults');
      while (vaccineDataList.length < files.length) {
        vaccineDataList.push({ isVaccine: false, vaccines: [] });
      }
    }

    // Convert base64 buffers back to Buffer objects
    const restoredFiles: Express.Multer.File[] = files.map(file => {
      const buffer = Buffer.from(file.buffer, 'base64');
      return {
        ...file,
        buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: buffer.length,
        fieldname: 'files', // Required by Express.Multer.File
        encoding: '7bit', // Default encoding
        destination: '',
        filename: file.originalname,
        path: '',
        stream: buffer instanceof Buffer ? require('stream').Readable.from(buffer) : undefined,
      };
    });

    for (let i = 0; i < restoredFiles.length; i++) {
      const file = restoredFiles[i];
      const fileType = file.mimetype.split('/')[1].toLowerCase();
      if (!allowedFileTypes.includes(fileType)) {
        console.error('Skipping audit log for invalid file type:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          petId,
          userId: user.id,
          error: 'Invalid file type',
        });
        continue;
      }

      // Validate file properties for S3 upload
      if (!file.buffer || !Buffer.isBuffer(file.buffer) || !file.originalname || !file.mimetype) {
        console.error('Skipping audit log for invalid file properties:', {
          originalname: file.originalname || 'unknown',
          hasBuffer: !!file.buffer,
          isBuffer: Buffer.isBuffer(file.buffer),
          bufferSize: file.buffer?.length,
          mimetype: file.mimetype,
          petId,
          userId: user.id,
          error: 'Invalid file: missing buffer, originalname, or mimetype',
        });
        continue;
      }

      const fileNameWithoutExt = path.parse(file.originalname).name;
      const vaccineDataEntry = vaccineDataList[i] || { isVaccine: false, vaccines: [] };
      const isVaccine = vaccineDataEntry.isVaccine;

      // Upload document
      let document;
      try {
        document = await this.documentsService.uploadDocument(
          {
            document_name: fileNameWithoutExt || `Pet-Document-${petId}-${Date.now()}`,
            document_type: isVaccine ? DocumentType.Medical : DocumentType.Medical,
            file_type: fileType.toUpperCase() as 'PDF' | 'JPG' | 'PNG' | 'JPEG',
            description: isVaccine ? `Vaccine document for pet ${petId}` : `Document for pet ${petId}`,
            pet_id: petId.toString(),
          },
          file,
          user,
          petId.toString(),
        );
      } catch (error) {
        console.error('Skipping audit log for S3 upload failure:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          bufferSize: file.buffer?.length,
          petId,
          userId: user.id,
          error: `S3 upload failed: ${error.message}`,
          stack: error.stack,
        });
        continue;
      }

      auditLogs.push(
        this.auditLogRepository.create({
          entity_type: 'Document',
          entity_id: document.id,
          action: 'Create',
          changes: { pet_id: petId, human_owner_id: user.id, is_vaccine: isVaccine },
          status: 'Success',
          ip_address: ipAddress,
          user_agent: userAgent,
        }),
      );

      // Create vaccines if applicable
      if (isVaccine && vaccineDataEntry.vaccines && vaccineDataEntry.vaccines.length > 0) {
        for (const vaccineData of vaccineDataEntry.vaccines) {
          if (
            vaccineData.vaccine_name &&
            vaccineData.date_administered &&
            vaccineData.expiry_date &&
            vaccineData.administered_by
          ) {
            const createVaccineDto = {
              vaccine_name: vaccineData.vaccine_name,
              date_administered: vaccineData.date_administered,
              date_due: vaccineData.expiry_date,
              administered_by: vaccineData.administered_by,
              pet_id: petId.toString(),
              vaccine_document_id: document.id,
            };

            try {
              const vaccine = await this.vaccinesService.create(createVaccineDto, user, undefined, ipAddress, userAgent);
              results.push({ type: 'vaccine', id: vaccine.id, document_id: document.id });
            } catch (error) {
              console.error('Skipping audit log for vaccine creation failure:', {
                petId,
                vaccineName: vaccineData.vaccine_name,
                userId: user.id,
                error: `Vaccine creation failed: ${error.message}`,
                stack: error.stack,
              });
            }
          }
        }
      } else {
        results.push({ type: 'document', id: document.id });
      }
    }

    // Batch save audit logs for successful operations only
    if (auditLogs.length > 0) {
      await this.auditLogRepository.save(auditLogs);
    }
    return results;
  }

  private async getCachedOrFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    const result = await fetchFn();
    if (result) {
      await this.redis.set(key, JSON.stringify(result), 'EX', this.CACHE_TTL);
    }
    return result;
  }

  private async analyzeDocumentsForPetInfo(files: Express.Multer.File[]): Promise<{
    petInfo: {
      pet_name: string | null;
      species: string | null;
      breed: string | null;
      age: number | null;
      weight: number | null;
      dob: string | null;
      color: string | null;
      microchip: string | null;
      spay_neuter: boolean | null;
    };
    vaccineDataList: Array<{
      isVaccine: boolean;
      vaccines: Array<{
        vaccine_name: string | null;
        date_administered: string | null;
        expiry_date: string | null;
        administered_by: string | null;
      }>;
    }>;
  }> {
    // Generate a hash of file contents for caching
    const fileHash = createHash('sha256')
      .update(files.map(file => file.buffer?.toString('base64') || '').join(''))
      .digest('hex');
    const cacheKey = `document:analysis:${fileHash}`;
    const cachedResult = await this.redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const prompt = `Extract pet and vaccine information from the provided documents:
    - Pet info: pet_name, species, breed, age (integer, years), weight (integer, pounds), dob (YYYY-MM-DD), color, microchip, spay_neuter (boolean).
    - For each document, identify if it's a vaccine record (contains vaccine name, date administered, expiry date, or administered by). If so, extract all vaccines: vaccine_name, date_administered (YYYY-MM-DD), expiry_date (YYYY-MM-DD), administered_by.
    Return a JSON object:
    - petInfo: Combined pet fields (prioritize non-null values from the first document).
    - vaccineDataList: Array of { isVaccine: boolean, vaccines: Array<{vaccine_name, date_administered, expiry_date, administered_by}> } per document.
    Example:
    {
      "petInfo": {"pet_name":"Max","species":"Dog","breed":"Labrador Retriever","age":3,"weight":70,"dob":"2022-05-10","color":"Yellow","microchip":"123456789","spay_neuter":true},
      "vaccineDataList":[{"isVaccine":true,"vaccines":[{"vaccine_name":"Rabies","date_administered":"2023-01-15","expiry_date":"2024-01-15","administered_by":"Dr. John Doe"}]},{"isVaccine":false,"vaccines":[]}]
    }`;

    // Process PDFs concurrently
    const pdfPromises = files
      .filter(file => file.mimetype.split('/')[1].toLowerCase() === 'pdf')
      .map(async file => {
        try {
          if (!file.buffer) {
            throw new Error(`File ${file.originalname} has no buffer`);
          }
          const pdfData = await pdfParse(file.buffer, { max: 1000 });
          return pdfData.text + '\n';
        } catch (error) {
          console.error(`Error parsing PDF ${file.originalname}:`, error);
          return '';
        }
      });

    const pdfTexts = await Promise.all(pdfPromises);
    const combinedText = pdfTexts.join('');
    const imageFiles = files.filter(file => ['jpg', 'jpeg', 'png'].includes(file.mimetype.split('/')[1].toLowerCase()));

    try {
      const messages: any[] = [
        {
          role: 'user',
          content: [],
        },
      ];

      if (combinedText) {
        messages[0].content.push({
          type: 'text',
          text: `${prompt}\n\nDocument text:\n${combinedText}`,
        });
      } else {
        messages[0].content.push({
          type: 'text',
          text: prompt,
        });
      }

      if (imageFiles.length > 0) {
        messages[0].content.push(
          ...imageFiles.map(file => {
            if (!file.buffer) {
              console.warn(`Skipping image ${file.originalname}: missing buffer`);
              return null;
            }
            return {
              type: 'image_url',
              image_url: {
                url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
              },
            };
          }).filter(item => item !== null),
        );
      }

      if (messages[0].content.length === 1 && !combinedText) {
        console.warn('No valid content to process');
        const result = {
          petInfo: {
            pet_name: null,
            species: null,
            breed: null,
            age: null,
            weight: null,
            dob: null,
            color: null,
            microchip: null,
            spay_neuter: null,
          },
          vaccineDataList: files.map(() => ({ isVaccine: false, vaccines: [] })),
        };
        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', this.CACHE_TTL);
        return result;
      }

      const result = await retry(
        () =>
          openaiClient.chat.completions.create({
            model: openaiModel,
            messages,
            stream: true,
          }) as Promise<Stream<ChatCompletionChunk>>,
        { retries: 3, delay: 1000, backoff: 'EXPONENTIAL' },
      );

      let responseText = '';
      for await (const chunk of result) {
        responseText += chunk.choices[0]?.delta?.content || '';
      }

      const response = JSON.parse(responseText.replace(/```json\n|```/g, '').trim());

      const vaccineDataList = response.vaccineDataList || files.map(() => ({ isVaccine: false, vaccines: [] }));
      if (vaccineDataList.length !== files.length) {
        console.warn('Mismatch in vaccineDataList length, padding with defaults');
        while (vaccineDataList.length < files.length) {
          vaccineDataList.push({ isVaccine: false, vaccines: [] });
        }
      }

      const finalResult = {
        petInfo: response.petInfo || {
          pet_name: null,
          species: null,
          breed: null,
          age: null,
          weight: null,
          dob: null,
          color: null,
          microchip: null,
          spay_neuter: null,
        },
        vaccineDataList,
      };

      await this.redis.set(cacheKey, JSON.stringify(finalResult), 'EX', this.CACHE_TTL);
      return finalResult;
    } catch (error) {
      console.error('Error extracting pet and vaccine info:', error);
      const result = {
        petInfo: {
          pet_name: null,
          species: null,
          breed: null,
          age: null,
          weight: null,
          dob: null,
          color: null,
          microchip: null,
          spay_neuter: null,
        },
        vaccineDataList: files.map(() => ({ isVaccine: false, vaccines: [] })),
      };
      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', this.CACHE_TTL);
      return result;
    }
  }

  async getNextPetCode(): Promise<string> {
    const latestPet = await this.petRepository.find({
      order: { id: 'DESC' },
      take: 1,
    });

    let code = 'AAAAA'; // Default code for the first pet or invalid cases
    if (latestPet && latestPet.length && latestPet[0]?.qr_code_id) {
      code = latestPet[0].qr_code_id;
    }

    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const base = charset.length;

    // Validate code length and content
    if (code.length !== 5 || !code.split('').every(char => charset.includes(char))) {
      console.warn(`Invalid qr_code_id found: "${code}". Defaulting to AAAAA.`);
      return 'AAAAA'; // Fallback to default code if invalid
    }

    const chars = code.split('');
    let i = 4;

    while (i >= 0) {
      const currentIndex = charset.indexOf(chars[i]);

      if (currentIndex < base - 1) {
        // Increment and stop
        chars[i] = charset[currentIndex + 1];
        break;
      } else {
        // Carry over
        chars[i] = charset[0];
        i--;
      }
    }

    // If all characters overflowed (e.g., '99999'), wrap to 'AAAAA'
    if (i < 0) {
      return 'AAAAA';
    }

    return chars.join('');
  }
}