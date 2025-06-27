import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PetProfile } from './entities/pet-profile.entity';
import { BreedSpecies } from './entities/breed-species.entity';
import { Breed } from './entities/breed.entity';
import { HumanOwner } from '@modules/human-owners/entities/human-owner.entity';
import { AuditLog } from '@modules/audit-logs/entities/audit-log.entity';
import { Document } from '@modules/documents/entities/document.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { UploadDocumentDto } from '@modules/documents/dto/upload-document.dto';
import { DocumentsService } from '@modules/documents/documents.service';
import { Status } from '@shared/enums/status.enum';
import { PetBreedSpeciesDto } from './dto/get-species-breed.dto';
import { DEFAULT_LIMIT, ZERO } from '@shared/utils/constants';
import { Express } from 'express';
import { DocumentType } from '@shared/enums/document-type.enum';

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
    private documentsService: DocumentsService,
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
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can access pets');
    }

    return this.petRepository.find({
      where: { human_owner: { id: user.id }, status: Status.Active },
      relations: ['breed_species', 'breed', 'human_owner', 'profilePictureDocument'],
    });
  }

  async findOne(id: string, user: any) {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can access pets');
    }

    const pet = await this.petRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['human_owner', 'breed_species', 'breed', 'profilePictureDocument'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    if (pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Unauthorized to access this pet');
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
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can access pet documents');
    }

    const pet = await this.petRepository.findOne({
      where: { id: petId, status: Status.Active },
      relations: ['human_owner'],
    });

    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    if (pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Unauthorized to access this pet\'s documents');
    }

    const petDocuments = await this.documentRepository.find({
      where: { pet: { id: petId }, status: Status.Active },
      relations: ['pet', 'human_owner', 'staff', 'business'],
    });

    return petDocuments;
  }

  async addPetDocument(petId: string, uploadDocumentDto: UploadDocumentDto, file: Express.Multer.File, user: any, ipAddress: string, userAgent: string) {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can add pet documents');
    }

    const pet = await this.petRepository.findOne({
      where: { id: petId, status: Status.Active },
      relations: ['human_owner'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    if (pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Unauthorized to add documents for this pet');
    }

    const document = await this.documentsService.uploadDocument(
      {
        ...uploadDocumentDto,
        pet_id: petId,
      },
      file,
      user,
      petId
    );

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'Document',
        entity_id: document.id,
        action: 'Create',
        changes: { ...uploadDocumentDto, pet_id: petId, human_owner_id: user.id },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return document;
  }

  async updatePetDocument(id: string, uploadDocumentDto: UploadDocumentDto, file: Express.Multer.File, user: any, ipAddress: string, userAgent: string) {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can update pet documents');
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

    if (document.pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Unauthorized to update this document');
    }

    const updatedDocument = await this.documentsService.updateDocument(
      id,
      {
        ...uploadDocumentDto,
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
        changes: { ...uploadDocumentDto, pet_id: document.pet.id, human_owner_id: user.id },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return updatedDocument;
  }

  async updatePetDocumentName(id: string, documentName: string, user: any, ipAddress: string, userAgent: string) {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can update pet documents');
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

    if (document.pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Unauthorized to update this document');
    }

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
        changes: { document_name: documentName, pet_id: document.pet.id, human_owner_id: user.id },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return updatedDocument;
  }

  async deletePetDocument(id: string, user: any, ipAddress: string, userAgent: string) {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can delete pet documents');
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

    if (document.pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Unauthorized to delete this document');
    }

    await this.documentRepository.remove(document);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'Document',
        entity_id: id,
        action: 'Delete',
        changes: { pet_id: document.pet.id, human_owner_id: user.id },
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return { message: 'Document deleted successfully' };
  }
}