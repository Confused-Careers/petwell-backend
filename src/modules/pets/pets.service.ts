import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PetProfile } from './entities/pet-profile.entity';
import { BreedSpecies } from './entities/breed-species.entity';
import { Breed } from './entities/breed.entity';
import { HumanOwner } from '@modules/human-owners/entities/human-owner.entity';
import { AuditLog } from '@modules/audit-logs/entities/audit-log.entity';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { Status } from '@shared/enums/status.enum';

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

    // Convert dob string to Date if provided
    const petData = {
      ...createPetDto,
      dob: createPetDto.dob ? new Date(createPetDto.dob) : undefined,
      human_owner: humanOwner,
      breed_species: breedSpecies,
      breed,
    };

    // Use unknown to safely cast to Partial<PetProfile>
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
      relations: ['breed_species', 'breed', 'human_owner'],
    });
  }

  async findOne(id: string, user: any) {
    if (user.entityType !== 'HumanOwner') {
      throw new UnauthorizedException('Only HumanOwner entities can access pets');
    }

    const pet = await this.petRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['human_owner', 'breed_species', 'breed'],
    });
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    if (pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Unauthorized to access this pet');
    }

    return pet;
  }

  async update(id: string, updatePetDto: UpdatePetDto, user: any, ipAddress: string, userAgent: string) {
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

    let breed: Breed | null = (pet as any).breed || null; // Fallback for TypeScript
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

    // Convert dob string to Date if provided
    const updatedData = {
      ...updatePetDto,
      dob: updatePetDto.dob ? new Date(updatePetDto.dob) : pet.dob,
      breed_species: breedSpecies,
      breed,
    };

    Object.assign(pet, updatedData);

    const updatedPet = await this.petRepository.save(pet);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: 'PetProfile',
        entity_id: id,
        action: 'Update',
        changes: { ...updatePetDto, human_owner_id: user.id },
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
        name: bs.species,
      })),
      breeds: breedSpecies.reduce((acc, bs) => {
        acc[bs.id] = bs.breeds.map((breed) => ({
          id: breed.id,
          name: breed.name,
        }));
        return acc;
      }, {} as Record<string, { id: string; name: string }[]>),
    };
  }
}