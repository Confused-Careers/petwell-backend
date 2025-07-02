import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Team } from './entities/team.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { Business } from '../businesses/entities/business.entity';
import { Staff } from '../staff/entities/staff.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Status } from '../../shared/enums/status.enum';
import { BusinessPetMapping } from '../businesses/entities/business-pet-mapping.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(HumanOwner)
    private humanOwnerRepository: Repository<HumanOwner>,
    @InjectRepository(PetProfile)
    private petRepository: Repository<PetProfile>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(BusinessPetMapping)
    private businessPetMappingRepository: Repository<BusinessPetMapping>,
  ) {}

  async create(createTeamDto: CreateTeamDto, user: any) {
    if (user.entityType !== 'HumanOwner') throw new UnauthorizedException('Only human owners can create teams');
    const humanOwner = await this.humanOwnerRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!humanOwner) throw new NotFoundException('Human owner not found');

    const pet = await this.petRepository.findOne({
      where: { id: createTeamDto.pet_id, status: Status.Active, human_owner: { id: user.id } },
    });
    if (!pet) throw new NotFoundException('Pet not found or not owned by the user');

    const business = await this.businessRepository.findOne({
      where: { id: createTeamDto.business_id, status: Status.Active },
    });
    if (!business) throw new NotFoundException('Business not found');

    // Check if team already exists
    const existingTeam = await this.teamRepository.findOne({
      where: {
        human_owner: { id: user.id },
        pet: { id: createTeamDto.pet_id },
        business: { id: createTeamDto.business_id },
        status: Status.Active,
      },
    });
    if (existingTeam) throw new BadRequestException('Team already exists for this human owner, pet, and business');

    // Check if BusinessPetMapping exists, create if not
    let businessPetMapping = await this.businessPetMappingRepository.findOne({
      where: {
        business: { id: createTeamDto.business_id },
        pet: { id: createTeamDto.pet_id },
        status: Status.Active,
      },
    });

    if (!businessPetMapping) {
      businessPetMapping = this.businessPetMappingRepository.create({
        business,
        pet,
        title: `Auto-generated mapping for ${pet.pet_name} with ${business.business_name}`,
        status: Status.Active,
      });
      await this.businessPetMappingRepository.save(businessPetMapping);
    }

    const team = this.teamRepository.create({
      human_owner: humanOwner,
      pet,
      business,
    });

    return this.teamRepository.save(team);
  }

  async findAll(user: any) {
    let query = this.teamRepository.createQueryBuilder('team')
      .leftJoinAndSelect('team.human_owner', 'human_owner')
      .leftJoinAndSelect('team.pet', 'pet')
      .leftJoinAndSelect('team.business', 'business')
      .leftJoinAndSelect('business.profilePictureDocument', 'profilePictureDocument')
      .where('team.status = :status', { status: Status.Active });

    if (user.entityType === 'HumanOwner') {
      query = query.andWhere('team.human_owner.id = :userId', { userId: user.id });
    }

    const teams = await query
      .select([
        'team.id',
        'team.status',
        'team.created_at',
        'team.updated_at',
        'human_owner.id',
        'human_owner.email',
        'pet.id',
        'pet.pet_name',
        'business.id',
        'business.business_name',
        'business.email',
        'business.description',
        'business.profile_picture_document_id',
        'business.phone',
        'business.website',
        'business.address',
        'profilePictureDocument.id',
        'profilePictureDocument.document_name',
        'profilePictureDocument.document_url',
        'profilePictureDocument.file_type',
        'profilePictureDocument.description',
      ])
      .getMany();

    return teams;
  }

  async findOne(id: string) {
    const team = await this.teamRepository.createQueryBuilder('team')
      .leftJoinAndSelect('team.human_owner', 'human_owner')
      .leftJoinAndSelect('team.pet', 'pet')
      .leftJoinAndSelect('team.business', 'business')
      .leftJoinAndSelect('business.profilePictureDocument', 'profilePictureDocument')
      .where('team.id = :id', { id })
      .andWhere('team.status = :status', { status: Status.Active })
      .select([
        'team.id',
        'team.status',
        'team.created_at',
        'team.updated_at',
        'human_owner.id',
        'human_owner.email',
        'pet.id',
        'pet.pet_name',
        'business.id',
        'business.business_name',
        'business.email',
        'business.phone',
        'business.website',
        'business.address',
        'business.description',
        'business.profile_picture_document_id',
        'profilePictureDocument.id',
        'profilePictureDocument.document_name',
        'profilePictureDocument.document_url',
        'profilePictureDocument.file_type',
        'profilePictureDocument.description',
      ])
      .getOne();

    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto, user: any) {
    const team = await this.findOne(id);
    if (user.entityType !== 'HumanOwner' || user.id !== team.human_owner.id) {
      throw new UnauthorizedException('Only the team’s human owner can update it');
    }

    if (updateTeamDto.pet_id) {
      const pet = await this.petRepository.findOne({
        where: { id: updateTeamDto.pet_id, status: Status.Active, human_owner: { id: user.id } },
      });
      if (!pet) throw new NotFoundException('Pet not found or not owned by the user');
      team.pet = pet;

      // Update or create BusinessPetMapping if pet is changed
      let businessPetMapping = await this.businessPetMappingRepository.findOne({
        where: {
          business: { id: team.business.id },
          pet: { id: updateTeamDto.pet_id },
          status: Status.Active,
        },
      });

      if (!businessPetMapping) {
        businessPetMapping = this.businessPetMappingRepository.create({
          business: team.business,
          pet,
          title: `Auto-generated mapping for ${pet.pet_name} with ${team.business.business_name}`,
          status: Status.Active,
        });
        await this.businessPetMappingRepository.save(businessPetMapping);
      }
    }

    if (updateTeamDto.business_id) {
      const business = await this.businessRepository.findOne({
        where: { id: updateTeamDto.business_id, status: Status.Active },
      });
      if (!business) throw new NotFoundException('Business not found');
      team.business = business;

      // Update or create BusinessPetMapping if business is changed
      let businessPetMapping = await this.businessPetMappingRepository.findOne({
        where: {
          business: { id: updateTeamDto.business_id },
          pet: { id: team.pet.id },
          status: Status.Active,
        },
      });

      if (!businessPetMapping) {
        businessPetMapping = this.businessPetMappingRepository.create({
          business,
          pet: team.pet,
          title: `Auto-generated mapping for ${team.pet.pet_name} with ${business.business_name}`,
          status: Status.Active,
        });
        await this.businessPetMappingRepository.save(businessPetMapping);
      }
    }

    return this.teamRepository.save(team);
  }

  async remove(id: string, user: any) {
    const team = await this.findOne(id);
    if (user.entityType !== 'HumanOwner' || user.id !== team.human_owner.id) {
      throw new UnauthorizedException('Only the team’s human owner can delete it');
    }

    await this.teamRepository.remove(team);
    return { message: 'Team deleted successfully' };
  }

  async searchBusinesses(query: string, user: any) {
    const whereClause = { status: Status.Active };
    if (query) {
      whereClause['business_name'] = Like(`%${query}%`);
    }

    const allBusinesses = await this.businessRepository.find({
      where: whereClause,
      select: ['id', 'business_name', 'email', 'description'],
    });

    if (user.entityType === 'HumanOwner') {
      const userTeams = await this.teamRepository.find({
        where: { human_owner: { id: user.id }, status: Status.Active },
        relations: ['business'],
      });
      const teamBusinessIds = userTeams.map(team => team.business.id);
      const prioritizedBusinesses = allBusinesses.filter(b => teamBusinessIds.includes(b.id));
      const otherBusinesses = allBusinesses.filter(b => !teamBusinessIds.includes(b.id));
      return [...prioritizedBusinesses, ...otherBusinesses];
    }

    return allBusinesses;
  }

  async searchDoctors(query: string, user: any) {
    if (user.entityType !== 'HumanOwner' && user.entityType !== 'Staff') {
      throw new UnauthorizedException('Only human owners and staff can search doctors');
    }

    const teams = user.entityType === 'HumanOwner'
      ? await this.teamRepository.find({
          where: { human_owner: { id: user.id }, status: Status.Active },
          relations: ['business'],
        })
      : await this.teamRepository.find({
          where: { status: Status.Active },
          relations: ['business'],
        });

    const businessIds = [...new Set(teams.map(team => team.business.id))];
    const whereClause = { status: Status.Active, business: { id: In(businessIds) }, role: 'Veterinarian' };
    if (query) {
      whereClause['staff_name'] = Like(`%${query}%`);
    }

    return this.staffRepository.find({
      where: whereClause,
      relations: ['business'],
      select: ['id', 'staff_name', 'email', 'role_name', 'business'],
    });
  }
}