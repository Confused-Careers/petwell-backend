import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { PetProfile } from './entities/pet-profile.entity';
import { BreedSpecies } from './entities/breed-species.entity';
import { Breed } from './entities/breed.entity';
import { HumanOwner } from '@modules/human-owners/entities/human-owner.entity';
import { AuditLog } from '@modules/audit-logs/entities/audit-log.entity';
import { Document } from '@modules/documents/entities/document.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentsService } from '@modules/documents/documents.service';
import { VaccinesService } from '@modules/vaccines/vaccines.service';
import { Status } from '@shared/enums/status.enum';
import { PetBreedSpeciesDto } from './dto/get-species-breed.dto';
import { DEFAULT_LIMIT, ZERO } from '@shared/utils/constants';
import { Express } from 'express';
import { DocumentType } from '@shared/enums/document-type.enum';
import { openaiClient, openaiModel } from '../../config/openai.config';
import * as pdfParse from 'pdf-parse';
import * as path from 'path';
import { BusinessPetMapping } from '@modules/businesses/entities/business-pet-mapping.entity';
import { Staff } from '@modules/staff/entities/staff.entity';
import { Vaccine } from '@modules/vaccines/entities/vaccine.entity';
import { NotificationService } from '@modules/notification/notification.service';
import { Business } from '@modules/businesses/entities/business.entity';

@Injectable()
export class PetsService {
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
    @InjectRepository(BusinessPetMapping)
    private businessPetMappingRepository: Repository<BusinessPetMapping>,
    @InjectRepository(Vaccine)
    private vaccineRepository: Repository<Vaccine>,
    private documentsService: DocumentsService,
    private vaccinesService: VaccinesService,
    private notificationService: NotificationService,
  ) {}

  async create(createPetDto: CreatePetDto, user: any, ipAddress: string, userAgent: string) {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can create pets');
    }

    const humanOwner = await this.humanOwnerRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!humanOwner) {
      throw new NotFoundException('Human owner not found');
    }

    const breedSpecies = await this.breedSpeciesRepository.findOne({
      where: { id: createPetDto.breed_species_id },
    });
    if (!breedSpecies) {
      throw new NotFoundException('Invalid breed_species ID');
    }

    let breed: Breed | null = null;
    if (createPetDto.breed_id) {
      breed = await this.breedRepository.findOne({
        where: { id: createPetDto.breed_id, breed_species: { id: createPetDto.breed_species_id } },
      });
      if (!breed) {
        throw new BadRequestException('Invalid breed ID or breed does not belong to the specified species');
      }
    }

    const petData = {
      ...createPetDto,
      dob: createPetDto.dob ? new Date(createPetDto.dob) : undefined,
      human_owner: humanOwner,
      breed_species: breedSpecies,
      breed,
    };

    const pet = this.petRepository.create(petData as unknown as Partial<PetProfile>);

    const savedPet = await this.petRepository.save(pet);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'PetProfile',
        entity_id: savedPet.id,
        action: 'Create',
        changes: { ...createPetDto, human_owner_id: user.id },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return savedPet;
  }

  async findAllByOwner(user: any) {
    if (user.entityType === 'HumanOwner') {
      return this.petRepository.find({
        where: { human_owner: { id: user.id }, status: Status.Active },
        relations: ['breed_species', 'breed', 'human_owner', 'profilePictureDocument'],
      });
    } else if (user.entityType === 'Business' || user.entityType === 'Staff') {
      const businessId = user.entityType === 'Business' ? user.id : (user as Staff).business.id;
      const mappings = await this.businessPetMappingRepository.find({
        where: { business: { id: businessId }, status: Status.Active } as FindOptionsWhere<BusinessPetMapping>,
        relations: ['pet', 'pet.breed_species', 'pet.breed', 'pet.human_owner', 'pet.profilePictureDocument'],
      });
      return mappings.map((mapping) => mapping.pet);
    } else {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can access pets');
    }
  }

  async findOne(id: string, user: any) {
    const pet = await this.petRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['human_owner', 'breed_species', 'breed', 'profilePictureDocument'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    if (user.entityType === 'HumanOwner') {
      if (pet.human_owner.id !== user.id) {
        throw new UnauthorizedException('Unauthorized to access this pet');
      }
    } else if (user.entityType === 'Business' || user.entityType === 'Staff') {
      const businessId = user.entityType === 'Business' ? user.id : (user as Staff).business.id;
      const mapping = await this.businessPetMappingRepository.findOne({
        where: { pet: { id }, business: { id: businessId }, status: Status.Active } as FindOptionsWhere<BusinessPetMapping>,
      });
      if (!mapping) {
        throw new UnauthorizedException('No business-pet mapping found for this pet');
      }
    } else {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can access pets');
    }

    return pet;
  }

  async update(id: string, updatePetDto: UpdatePetDto, user: any, ipAddress: string, userAgent: string, file?: Express.Multer.File) {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can update pets');
    }

    const pet = await this.petRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['human_owner', 'breed_species', 'breed'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    if (pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Unauthorized to update this pet');
    }

    let breedSpecies = pet.breed_species;
    if (updatePetDto.breed_species_id) {
      breedSpecies = await this.breedSpeciesRepository.findOne({
        where: { id: updatePetDto.breed_species_id },
      });
      if (!breedSpecies) {
        throw new NotFoundException('Invalid breed_species ID');
      }
    }

    let breed: Breed | null = pet.breed || null;
    if (updatePetDto.breed_id) {
      breed = await this.breedRepository.findOne({
        where: { id: updatePetDto.breed_id, breed_species: { id: breedSpecies.id } },
      });
      if (!breed) {
        throw new BadRequestException('Invalid breed ID or breed does not belong to the specified species');
      }
    } else if (updatePetDto.breed_id === null) {
      breed = null;
    }

    let profilePictureDocumentId: string | null = pet.profile_picture_document_id;
    if (file) {
      const document = await this.documentsService.uploadDocument(
        {
          document_name: `pet-profile-picture-${id}`,
          document_type: DocumentType.ProfilePicture,
          file_type: (() => {
            const allowedTypes = ['PDF', 'JPG', 'PNG', 'DOC', 'JPEG'] as const;
            const type = file && typeof file.mimetype === 'string'
              ? file.mimetype.split('/')[1]?.toUpperCase()
              : undefined;
            if (!type || !allowedTypes.includes(type as any)) {
              throw new BadRequestException('Unsupported file type');
            }
            return type as typeof allowedTypes[number];
          })(),
        },
        file,
        user,
        id,
      );
      profilePictureDocumentId = document.id;
    }

    const updatedData = {
      ...updatePetDto,
      dob: updatePetDto.dob ? new Date(updatePetDto.dob) : pet.dob,
      breed_species: breedSpecies,
      breed,
      profile_picture_document_id: profilePictureDocumentId,
    };

    Object.assign(pet, updatedData);

    const updatedPet = await this.petRepository.save(pet);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'PetProfile',
        entity_id: id,
        action: 'Update',
        changes: { ...updatePetDto, human_owner_id: user.id, profile_picture_document_id: profilePictureDocumentId },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return updatedPet;
  }

  private async checkPetAccess(petId: string, user: any): Promise<PetProfile> {
    const pet = await this.petRepository.findOne({
      where: { id: petId, status: Status.Active },
      relations: ['human_owner'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    if (user.entityType === 'HumanOwner' && pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Unauthorized to access this pet');
    }

    if (user.entityType === 'Business' || user.entityType === 'Staff') {
      const businessId = user.entityType === 'Business' ? user.id : (user as Staff).business.id;
      const mapping = await this.businessPetMappingRepository.findOne({
        where: {
          pet: { id: petId },
          business: { id: businessId },
          status: Status.Active,
        } as FindOptionsWhere<BusinessPetMapping>,
      });
      if (!mapping) {
        throw new UnauthorizedException('No business-pet mapping found for this pet');
      }
    }

    return pet;
  }

  async addMultiplePetDocuments(
    petId: string,
    uploadDocumentDto: UploadDocumentDto,
    files: Express.Multer.File[],
    user: any,
    ipAddress: string,
    userAgent: string,
  ) {
    if (!['HumanOwner', 'Business', 'Staff'].includes(user.entityType)) {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can add pet documents');
    }

    const pet = await this.checkPetAccess(petId, user);

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    const allowedFileTypes = ['pdf', 'jpg', 'jpeg', 'png'];
    for (const file of files) {
      const fileType = file.mimetype.split('/')[1].toLowerCase();
      if (!allowedFileTypes.includes(fileType)) {
        throw new BadRequestException('Unsupported file type. Only PDF, JPG, JPEG, and PNG are allowed');
      }
    }

    const results = [];

    for (const file of files) {
      const fileType = file.mimetype.split('/')[1].toLowerCase();
      const fileNameWithoutExt = path.parse(file.originalname).name;

      const { isVaccine, vaccines } = await this.classifyAndExtractDocument(file, fileType);

      const document = await this.documentsService.uploadDocument(
        {
          ...uploadDocumentDto,
          document_name: uploadDocumentDto.document_name || fileNameWithoutExt || `Pet-Document-${petId}-${Date.now()}`,
          document_type: isVaccine ? DocumentType.Medical : (uploadDocumentDto.document_type || DocumentType.Medical),
          file_type: fileType.toUpperCase() as 'PDF' | 'JPG' | 'PNG' | 'JPEG',
          description: uploadDocumentDto.description || (isVaccine ? `Vaccine document for pet ${petId}` : `Document for pet ${petId}`),
          pet_id: petId,
        },
        file,
        user,
        petId,
      );

      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entity_type: 'Document',
          entity_id: document.id,
          action: 'Create',
          changes: {
            ...uploadDocumentDto,
            pet_id: petId,
            human_owner_id: pet.human_owner.id,
            is_vaccine: isVaccine,
            business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
            staff_id: user.entityType === 'Staff' ? user.id : undefined,
          },
          status: 'Success',
          ip_address: ipAddress,
          user_agent: userAgent,
        }),
      );

      if (isVaccine && vaccines && vaccines.length > 0) {
        for (const vaccineData of vaccines) {
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
              pet_id: petId,
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

    return { message: 'Documents processed successfully', results };
  }

  async addPetDocument(petId: string, uploadDocumentDto: UploadDocumentDto, file: Express.Multer.File, user: any, ipAddress: string, userAgent: string) {
    if (!['HumanOwner', 'Business', 'Staff'].includes(user.entityType)) {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can add pet documents');
    }

    const pet = await this.checkPetAccess(petId, user);

    const fileType = file.mimetype.split('/')[1].toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(fileType)) {
      throw new BadRequestException('Unsupported file type. Only PDF, JPG, JPEG, and PNG are allowed');
    }

    const fileNameWithoutExt = path.parse(file.originalname).name;

    const { isVaccine, vaccines } = await this.classifyAndExtractDocument(file, fileType);

    const document = await this.documentsService.uploadDocument(
      {
        ...uploadDocumentDto,
        document_name: uploadDocumentDto.document_name || fileNameWithoutExt || `Pet-Document-${petId}-${Date.now()}`,
        document_type: isVaccine ? DocumentType.Medical : (uploadDocumentDto.document_type || DocumentType.Medical),
        file_type: fileType.toUpperCase() as 'PDF' | 'JPG' | 'PNG' | 'JPEG',
        description: uploadDocumentDto.description || (isVaccine ? `Vaccine document for pet ${petId}` : `Document for pet ${petId}`),
        pet_id: petId,
      },
      file,
      user,
      petId,
    );

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'Document',
        entity_id: document.id,
        action: 'Create',
        changes: {
          ...uploadDocumentDto,
          pet_id: petId,
          human_owner_id: pet.human_owner.id,
          is_vaccine: isVaccine,
          business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
          staff_id: user.entityType === 'Staff' ? user.id : undefined,
        },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    let business: Business | undefined;
    let staff: Staff | undefined;

    if ((user.entityType === 'Business' || user.entityType === 'Staff') && !isVaccine) {
      business = user.entityType === 'Business' ? { id: user.id, business_name: user.business_name } as Business : (user as Staff).business;
      staff = user.entityType === 'Staff' ? { id: user.id, staff_name: user.staff_name } as Staff : undefined;
      await this.notificationService.createDocumentUploadedNotification(
        petId,
        document.description || 'Document uploaded',
        user,
        business,
        staff,
      );
    }

    const results = [];
    if (isVaccine && vaccines && vaccines.length > 0) {
      for (const vaccineData of vaccines) {
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
            pet_id: petId,
            vaccine_document_id: document.id,
          };

          const vaccine = await this.vaccinesService.create(createVaccineDto, user, undefined, ipAddress, userAgent);
          results.push({ type: 'vaccine', id: vaccine.id, document_id: document.id });
        }
      }
    }

    if (results.length === 0) {
      results.push({ type: 'document', id: document.id });
    }

    return results.length === 1 ? results[0] : { type: 'multiple', results };
  }

  private async classifyAndExtractDocument(file: Express.Multer.File, fileType: string): Promise<{
    isVaccine: boolean;
    vaccines: Array<{
      vaccine_name: string | null;
      date_administered: string | null;
      expiry_date: string | null;
      administered_by: string | null;
    }>;
  }> {
    const prompt = `Determine if the provided document is a vaccine record. A vaccine record typically contains information such as vaccine name, date administered, expiry date, or administered by a veterinarian. If it is a vaccine record, extract details for ALL vaccines listed:
    - Vaccine name
    - Date administered (format: YYYY-MM-DD)
    - Expiry date (format: YYYY-MM-DD)
    - Administered by (doctor's name)
    Return a JSON object with:
    - isVaccine: boolean
    - vaccines: array of objects with the extracted fields (empty array if not a vaccine record)
    Example: 
    {
      "isVaccine": true,
      "vaccines": [
        {"vaccine_name":"Rabies","date_administered":"2023-01-15","expiry_date":"2024-01-15","administered_by":"Dr. John Doe"},
        {"vaccine_name":"Distemper","date_administered":"2023-01-15","expiry_date":"2024-01-15","administered_by":"Dr. John Doe"}
      ]
    }
    or
    {
      "isVaccine": false,
      "vaccines": []
    }`;

    try {
      if (fileType === 'pdf') {
        const pdfData = await pdfParse(file.buffer);
        const pdfText = pdfData.text;

        const result = await openaiClient.chat.completions.create({
          model: openaiModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: `${prompt}\n\nDocument text:\n${pdfText}` },
              ],
            },
          ],
        });

        const responseText = result.choices[0].message.content;
        return JSON.parse(responseText.replace(/```json\n|```/g, '').trim());
      } else {
        const result = await openaiClient.chat.completions.create({
          model: openaiModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
                  },
                },
              ],
            },
          ],
        });

        const responseText = result.choices[0].message.content;
        return JSON.parse(responseText.replace(/```json\n|```/g, '').trim());
      }
    } catch (error) {
      console.error('Error processing document:', error);
      return { isVaccine: false, vaccines: [] };
    }
  }

  async getAllBreedsAndSpecies() {
    const breedSpecies = await this.breedSpeciesRepository.find({ relations: ['breeds'] });
    return {
      species: breedSpecies.map((bs) => ({
        id: bs.id,
        name: bs.species_name,
      })),
      breeds: breedSpecies.reduce((acc, bs) => {
        acc[bs.id] = bs.breeds.map((breed) => ({
          id: breed.id,
          name: breed.breed_name,
        }));
        return acc;
      }, {} as Record<string, { id: string; name: string }[]>),
    };
  }

  async getSpecies(petBreedSpeciesDto: PetBreedSpeciesDto) {
    let species = this.breedSpeciesRepository.createQueryBuilder('species')
      .select([
        'species.species_name as species_name',
        'species.id as id'
      ])
      .where('species.status = :status', {
        status: Status.Active
      });
    if (petBreedSpeciesDto.search_txt) {
      species.andWhere('species.species_name ILIKE :search_txt', { search_txt: `%${petBreedSpeciesDto.search_txt.trim()}%` });
    }

    return species.orderBy("species.id", "DESC").offset(petBreedSpeciesDto?.skip || ZERO).limit(petBreedSpeciesDto?.limit || DEFAULT_LIMIT).getRawMany();
  }

  async getBreeds(petBreedSpeciesDto: PetBreedSpeciesDto) {
    let breeds = this.breedRepository.createQueryBuilder('breed')
      .select([
        'breed.breed_name as breed_name',
        'breed.id as id'
      ])
      .where('breed.status = :status', {
        status: Status.Active
      });
    if (petBreedSpeciesDto.breed_species_id) {
      breeds.andWhere('breed.breedSpeciesId = :species_id', {
        species_id: petBreedSpeciesDto.breed_species_id,
      });
    }
    if (petBreedSpeciesDto.search_txt) {
      breeds.andWhere('breed.breed_name ILIKE :search_txt', { search_txt: `%${petBreedSpeciesDto.search_txt.trim()}%` });
    }

    return breeds.getRawMany();
  }

  async getPetDocuments(petId: string, user: any) {
    if (!['HumanOwner', 'Business', 'Staff'].includes(user.entityType)) {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can access pet documents');
    }

    const pet = await this.checkPetAccess(petId, user);

    const petDocuments = await this.documentRepository.find({
      where: { pet: { id: petId }, status: Status.Active },
      relations: ['pet', 'human_owner', 'staff', 'business'],
    });

    return petDocuments;
  }

  async updatePetDocument(id: string, uploadDocumentDto: UploadDocumentDto, file: Express.Multer.File, user: any, ipAddress: string, userAgent: string) {
    if (!['HumanOwner', 'Business', 'Staff'].includes(user.entityType)) {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can update pet documents');
    }

    const document = await this.documentRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['pet', 'human_owner', 'pet.human_owner'],
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.pet) {
      throw new BadRequestException('Document is not associated with a pet');
    }

    await this.checkPetAccess(document.pet.id, user);

    const fileType = file.mimetype.split('/')[1].toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(fileType)) {
      throw new BadRequestException('Unsupported file type. Only PDF, JPG, JPEG, and PNG are allowed');
    }

    const fileNameWithoutExt = path.parse(file.originalname).name;

    const updatedDocument = await this.documentsService.updateDocument(
      id,
      {
        ...uploadDocumentDto,
        document_name: uploadDocumentDto.document_name || fileNameWithoutExt || `Pet-Document-${document.pet.id}-${Date.now()}`,
        document_type: uploadDocumentDto.document_type || DocumentType.Medical,
        file_type: fileType.toUpperCase() as 'PDF' | 'JPG' | 'PNG' | 'JPEG',
        pet_id: document.pet.id,
      },
      file,
      user,
    );

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'Document',
        entity_id: updatedDocument.id,
        action: 'Update',
        changes: {
          ...uploadDocumentDto,
          pet_id: document.pet.id,
          human_owner_id: document.pet.human_owner.id,
          business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
          staff_id: user.entityType === 'Staff' ? user.id : undefined,
        },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return updatedDocument;
  }

  async updatePetDocumentName(id: string, documentName: string, user: any, ipAddress: string, userAgent: string) {
    if (!['HumanOwner', 'Business', 'Staff'].includes(user.entityType)) {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can update pet documents');
    }

    const document = await this.documentRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['pet', 'human_owner', 'pet.human_owner'],
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.pet) {
      throw new BadRequestException('Document is not associated with a pet');
    }

    await this.checkPetAccess(document.pet.id, user);

    if (!documentName || documentName.trim().length === 0) {
      throw new BadRequestException('Document name cannot be empty');
    }

    document.document_name = documentName.trim();
    const updatedDocument = await this.documentRepository.save(document);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'Document',
        entity_id: id,
        action: 'Update',
        changes: {
          document_name: documentName,
          pet_id: document.pet.id,
          human_owner_id: document.pet.human_owner.id,
          business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
          staff_id: user.entityType === 'Staff' ? user.id : undefined,
        },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return updatedDocument;
  }

  async deletePetDocument(id: string, user: any, ipAddress: string, userAgent: string) {
    if (!['HumanOwner', 'Business', 'Staff'].includes(user.entityType)) {
      throw new UnauthorizedException('Only HumanOwner, Business, or Staff entities can delete pet documents');
    }

    const document = await this.documentRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['pet', 'human_owner', 'pet.human_owner'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.pet) {
      throw new BadRequestException('Document is not associated with a pet');
    }

    await this.checkPetAccess(document.pet.id, user);

    const relatedVaccines = await this.vaccineRepository.find({
      where: { vaccine_document_id: id, status: Status.Active },
    });

    if (relatedVaccines.length > 0) {
      await this.vaccineRepository.update(
        { vaccine_document_id: id },
        { vaccine_document_id: null },
      );
    }

    await this.documentRepository.remove(document);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'Document',
        entity_id: id,
        action: 'Delete',
        changes: {
          pet_id: document.pet.id,
          human_owner_id: document.pet.human_owner.id,
          business_id: user.entityType === 'Business' ? user.id : user.entityType === 'Staff' ? (user as Staff).business.id : undefined,
          staff_id: user.entityType === 'Staff' ? user.id : undefined,
          related_vaccines: relatedVaccines.length > 0 ? relatedVaccines.map(v => v.id) : undefined,
        },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return { message: 'Document deleted successfully' };
  }
}