import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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

    const team = this.teamRepository.create({
      human_owner: humanOwner,
      pet,
      business,
    });

    return this.teamRepository.save(team);
  }

  async findAll(user: any) {
    if (user.entityType === 'HumanOwner') {
      return this.teamRepository.find({
        where: { human_owner: { id: user.id }, status: Status.Active },
        relations: ['human_owner', 'pet', 'business'],
      });
    }
    return this.teamRepository.find({
      where: { status: Status.Active },
      relations: ['human_owner', 'pet', 'business'],
    });
  }

  async findOne(id: string) {
    const team = await this.teamRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['human_owner', 'pet', 'business'],
    });
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
    }

    if (updateTeamDto.business_id) {
      const business = await this.businessRepository.findOne({
        where: { id: updateTeamDto.business_id, status: Status.Active },
      });
      if (!business) throw new NotFoundException('Business not found');
      team.business = business;
    }

    return this.teamRepository.save(team);
  }

  async remove(id: string, user: any) {
    const team = await this.findOne(id);
    if (user.entityType !== 'HumanOwner' || user.id !== team.human_owner.id) {
      throw new UnauthorizedException('Only the team’s human owner can delete it');
    }

    team.status = Status.Inactive;
    return this.teamRepository.save(team);
  }

  async searchBusinesses(query: string, user: any) {
    const whereClause = { status: Status.Active };
    if (query) {
      whereClause['name'] = Like(`%${query}%`);
    }

    const allBusinesses = await this.businessRepository.find({
      where: whereClause,
      select: ['id', 'name', 'email', 'description'],
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
      whereClause['name'] = Like(`%${query}%`);
    }

    return this.staffRepository.find({
      where: whereClause,
      relations: ['business'],
      select: ['id', 'name', 'email', 'role', 'business'],
    });
  }
}