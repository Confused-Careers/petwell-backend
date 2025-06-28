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

@Injectable()
export class UserPetService {
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
  ) {}

  async createPetFromDocuments(
    files: Express.Multer.File[],
    user: any,
    ipAddress: string,
    userAgent: string,
  ) {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can create pets');
    }

    const humanOwner = await this.humanOwnerRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!humanOwner) {
      throw new NotFoundException('Human owner not found');
    }

    // Ensure default "Other" species and breed exist
    let otherSpecies = await this.breedSpeciesRepository.findOne({ where: { species_name: 'Other', status: Status.Active } });
    if (!otherSpecies) {
      otherSpecies = this.breedSpeciesRepository.create({
        species_name: 'Other',
        status: Status.Active,
        species_description: 'Default species for unmapped entries',
      });
      otherSpecies = await this.breedSpeciesRepository.save(otherSpecies);
    }

    let otherBreed = await this.breedRepository.findOne({
      where: { breed_name: 'Other', breed_species: { id: otherSpecies.id }, status: Status.Active },
    });
    if (!otherBreed) {
      otherBreed = this.breedRepository.create({
        breed_name: 'Other',
        breed_species: otherSpecies,
        status: Status.Active,
        breed_description: 'Default breed for unmapped entries',
      });
      otherBreed = await this.breedRepository.save(otherBreed);
    }

    // Extract pet and vaccine information from documents
    const { petInfo, vaccineDataList } = await this.analyzeDocumentsForPetInfo(files);
    const { pet_name, species, breed, age, weight, dob, color, microchip, spay_neuter } = petInfo;

    // Map species and breed
    let breedSpecies = otherSpecies;
    if (species) {
      const foundSpecies = await this.breedSpeciesRepository.findOne({
        where: { species_name: species, status: Status.Active },
      });
      if (foundSpecies) {
        breedSpecies = foundSpecies;
      }
    }

    let breedEntity: Breed | null = otherBreed;
    if (breed && breedSpecies.id !== otherSpecies.id) {
      const foundBreed = await this.breedRepository.findOne({
        where: { breed_name: breed, breed_species: { id: breedSpecies.id }, status: Status.Active },
      });
      if (foundBreed) {
        breedEntity = foundBreed;
      }
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
    };

    const pet = this.petRepository.create(petData);
    const savedPet = await this.petRepository.save(pet);

    // Process documents and vaccines
    const results = [];
    const allowedFileTypes = ['pdf', 'jpg', 'jpeg', 'png'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = file.mimetype.split('/')[1].toLowerCase();
      if (!allowedFileTypes.includes(fileType)) {
        throw new BadRequestException('Unsupported file type. Only PDF, JPG, JPEG, and PNG are allowed');
      }

      const fileNameWithoutExt = path.parse(file.originalname).name;

      // Get vaccine data for this file (if any)
      const vaccineDataEntry = vaccineDataList[i] || { isVaccine: false, vaccines: [] };
      const isVaccine = vaccineDataEntry.isVaccine;

      // Upload document
      const document = await this.documentsService.uploadDocument(
        {
          document_name: fileNameWithoutExt || `Pet-Document-${savedPet.id}-${Date.now()}`,
          document_type: isVaccine ? DocumentType.Medical : DocumentType.Medical,
          file_type: fileType.toUpperCase() as 'PDF' | 'JPG' | 'PNG' | 'JPEG',
          description: isVaccine ? `Vaccine document for pet ${savedPet.id}` : `Document for pet ${savedPet.id}`,
          pet_id: savedPet.id,
        },
        file,
        user,
        savedPet.id,
      );

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entity_type: 'Document',
          entity_id: document.id,
          action: 'Create',
          changes: { pet_id: savedPet.id, human_owner_id: user.id, is_vaccine: isVaccine },
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
              pet_id: savedPet.id,
              vaccine_document_id: document.id,
            };

            const vaccine = await this.vaccinesService.create(createVaccineDto, user, undefined, ipAddress, userAgent);
            results.push({ type: 'vaccine', id: vaccine.id, document_id: document.id });
          }
        }
      } else {
        results.push({ type: 'document', id: document.id });
      }
    }

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
      message: 'Pet created and documents processed successfully',
      pet: savedPet,
      documents: results,
    };
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
    const prompt = `For each provided document, perform the following:
    1. Extract pet information:
       - Pet name
       - Species
       - Breed
       - Age (in years, integer)
       - Weight (in pounds, integer)
       - Date of birth (format: YYYY-MM-DD)
       - Color
       - Microchip number
       - Spay/Neuter status (boolean)
    2. Determine if the document is a vaccine record (contains vaccine name, date administered, expiry date, or administered by a veterinarian). If it is, extract details for ALL vaccines listed:
       - Vaccine name
       - Date administered (format: YYYY-MM-DD)
       - Expiry date (format: YYYY-MM-DD)
       - Administered by (doctor's name)
    Return a JSON object with:
    - petInfo: object with the extracted pet fields (combine information from all documents, prioritizing non-null values from the first document where each field is found)
    - vaccineDataList: array of objects, one per document, each containing:
      - isVaccine: boolean
      - vaccines: array of objects with vaccine fields (empty array if not a vaccine record)
    Example:
    {
      "petInfo": {
        "pet_name": "Max",
        "species": "Dog",
        "breed": "Labrador Retriever",
        "age": 3,
        "weight": 70,
        "dob": "2022-05-10",
        "color": "Yellow",
        "microchip": "123456789",
        "spay_neuter": true
      },
      "vaccineDataList": [
        {
          "isVaccine": true,
          "vaccines": [
            {"vaccine_name":"Rabies","date_administered":"2023-01-15","expiry_date":"2024-01-15","administered_by":"Dr. John Doe"},
            {"vaccine_name":"Distemper","date_administered":"2023-01-15","expiry_date":"2024-01-15","administered_by":"Dr. John Doe"}
          ]
        },
        {
          "isVaccine": false,
          "vaccines": []
        }
      ]
    }`;

    let combinedText = '';
    const imageFiles: Express.Multer.File[] = [];

    // Separate PDFs and images
    for (const file of files) {
      const fileType = file.mimetype.split('/')[1].toLowerCase();
      if (fileType === 'pdf') {
        try {
          const pdfData = await pdfParse(file.buffer);
          combinedText += pdfData.text + '\n';
        } catch (error) {
          console.error('Error parsing PDF:', error);
        }
      } else if (['jpg', 'jpeg', 'png'].includes(fileType)) {
        imageFiles.push(file);
      }
    }

    try {
      const messages: any[] = [
        {
          role: 'user',
          content: [],
        },
      ];

      // Add text from PDFs if available
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

      // Add images if available
      if (imageFiles.length > 0) {
        messages[0].content.push(
          ...imageFiles.map(file => ({
            type: 'image_url',
            image_url: {
              url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            },
          })),
        );
      }

      // Only make the API call if there is content to process
      if (messages[0].content.length === 1 && !combinedText) {
        console.warn('No valid content to process (no text or images)');
        return {
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
      }

      const result = await openaiClient.chat.completions.create({
        model: openaiModel,
        messages,
      });

      const responseText = result.choices[0].message.content;
      const response = JSON.parse(responseText.replace(/```json\n|```/g, '').trim());

      // Ensure vaccineDataList length matches the number of files
      const vaccineDataList = response.vaccineDataList || files.map(() => ({ isVaccine: false, vaccines: [] }));
      if (vaccineDataList.length !== files.length) {
        console.warn('Mismatch in vaccineDataList length, padding with defaults');
        while (vaccineDataList.length < files.length) {
          vaccineDataList.push({ isVaccine: false, vaccines: [] });
        }
      }

      return {
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
    } catch (error) {
      console.error('Error extracting pet and vaccine info:', error);
      return {
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
    }
  }
}