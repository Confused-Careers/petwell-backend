import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vaccine } from './entities/vaccine.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Business } from '../businesses/entities/business.entity';
import { Team } from '../teams/entities/team.entity';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { UpdateVaccineDto } from './dto/update-vaccine.dto';
import { Status } from '../../shared/enums/status.enum';

@Injectable()
export class VaccinesService {
  constructor(
    @InjectRepository(Vaccine)
    private vaccineRepository: Repository<Vaccine>,
    @InjectRepository(PetProfile)
    private petRepository: Repository<PetProfile>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
  ) {}

  async create(createVaccineDto: CreateVaccineDto, user: any) {
    const { name, date_administered, date_due, staff_id, pet_id } = createVaccineDto;

    const pet = await this.petRepository.findOne({
      where: { id: pet_id, status: Status.Active },
      relations: ['human_owner', 'breed_species'],
    });
    if (!pet) throw new NotFoundException('Pet not found');
    if (pet.breed_species.species !== 'Dog' && pet.breed_species.species !== 'Cat') throw new UnauthorizedException('Vaccines are only for dogs or cats');

    const staff = await this.staffRepository.findOne({
      where: { id: staff_id, status: Status.Active, role: 'Veterinarian' },
      relations: ['business'],
    });
    if (!staff) throw new NotFoundException('Veterinarian not found');

    if (user.entityType === 'Staff' && user.id !== staff_id) {
      throw new UnauthorizedException('Staff can only create vaccines for themselves');
    }
    if (user.entityType === 'Business' && staff.business.id !== user.id) {
      throw new UnauthorizedException('Business can only create vaccines for their staff');
    }
    if (user.entityType === 'HumanOwner' && pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Human owners can only create vaccines for their own pets');
    }

    const team = await this.teamRepository.findOne({
      where: { pet: { id: pet_id }, business: { id: staff.business.id }, status: Status.Active },
    });
    if (!team) throw new UnauthorizedException('Pet must be linked to the business via a team');

    const vaccine = this.vaccineRepository.create({
      name,
      date_administered: new Date(date_administered),
      date_due: new Date(date_due),
      staff,
      pet,
      human_owner: pet.human_owner,
    });

    return this.vaccineRepository.save(vaccine);
  }

  async findAll(petId?: string) {
    const query = this.vaccineRepository.createQueryBuilder('vaccine')
      .leftJoinAndSelect('vaccine.pet', 'pet')
      .leftJoinAndSelect('vaccine.staff', 'staff')
      .leftJoinAndSelect('vaccine.human_owner', 'human_owner')
      .where('vaccine.status = :status', { status: Status.Active });

    if (petId) {
      query.andWhere('vaccine.pet_id = :petId', { petId });
    }

    return query.getMany();
  }

  async findOne(id: string) {
    const vaccine = await this.vaccineRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['pet', 'staff', 'human_owner'],
    });
    if (!vaccine) throw new NotFoundException('Vaccine not found');
    return vaccine;
  }

  async update(id: string, updateVaccineDto: UpdateVaccineDto, user: any) {
    const vaccine = await this.findOne(id);

    if (user.entityType === 'Staff' && user.id !== vaccine.staff.id) {
      throw new UnauthorizedException('Staff can only update their own vaccines');
    }
    if (user.entityType === 'Business') {
      const staff = await this.staffRepository.findOne({
        where: { id: vaccine.staff.id, status: Status.Active },
        relations: ['business'],
      });
      if (!staff || staff.business.id !== user.id) {
        throw new UnauthorizedException('Business can only update vaccines for their staff');
      }
    }
    if (user.entityType === 'HumanOwner' && vaccine.pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Human owners can only update vaccines for their own pets');
    }

    if (updateVaccineDto.pet_id) {
      const pet = await this.petRepository.findOne({
        where: { id: updateVaccineDto.pet_id, status: Status.Active },
        relations: ['human_owner', 'breed_species'],
      });
      if (!pet) throw new NotFoundException('Pet not found');
      if (pet.breed_species.species !== 'Dog' && pet.breed_species.species !== 'Cat') throw new UnauthorizedException('Vaccines are only for dogs or cats');
      vaccine.pet = pet;
      vaccine.human_owner = pet.human_owner;
    }

    if (updateVaccineDto.staff_id) {
      const staff = await this.staffRepository.findOne({
        where: { id: updateVaccineDto.staff_id, status: Status.Active, role: 'Veterinarian' },
        relations: ['business'],
      });
      if (!staff) throw new NotFoundException('Veterinarian not found');
      if (user.entityType === 'Business' && staff.business.id !== user.id) {
        throw new UnauthorizedException('Business can only assign vaccines to their staff');
      }
      vaccine.staff = staff;

      const team = await this.teamRepository.findOne({
        where: { pet: { id: vaccine.pet.id }, business: { id: staff.business.id }, status: Status.Active },
      });
      if (!team) throw new UnauthorizedException('Pet must be linked to the business via a team');
    }

    Object.assign(vaccine, {
      name: updateVaccineDto.name ?? vaccine.name,
      date_administered: updateVaccineDto.date_administered
        ? new Date(updateVaccineDto.date_administered)
        : vaccine.date_administered,
      date_due: updateVaccineDto.date_due ? new Date(updateVaccineDto.date_due) : vaccine.date_due,
    });

    return this.vaccineRepository.save(vaccine);
  }

  async remove(id: string, user: any) {
    const vaccine = await this.findOne(id);

    if (user.entityType === 'Staff' && user.id !== vaccine.staff.id) {
      throw new UnauthorizedException('Staff can only delete their own vaccines');
    }
    if (user.entityType === 'Business') {
      const staff = await this.staffRepository.findOne({
        where: { id: vaccine.staff.id, status: Status.Active },
        relations: ['business'],
      });
      if (!staff || staff.business.id !== user.id) {
        throw new UnauthorizedException('Business can only delete vaccines for their staff');
      }
    }
    if (user.entityType === 'HumanOwner' && vaccine.pet.human_owner.id !== user.id) {
      throw new UnauthorizedException('Human owners can only delete vaccines for their own pets');
    }

    vaccine.status = Status.Inactive;
    return this.vaccineRepository.save(vaccine);
  }

  async findDoctors(petId?: string, businessId?: string) {
    const query = this.staffRepository.createQueryBuilder('staff')
      .leftJoinAndSelect('staff.business', 'business')
      .where('staff.role = :role', { role: 'Veterinarian' })
      .andWhere('staff.status = :status', { status: Status.Active });

    if (petId) {
      query
        .leftJoinAndSelect('teams', 'team', 'team.business_id = staff.business_id')
        .andWhere('team.pet_id = :petId', { petId })
        .andWhere('team.status = :status', { status: Status.Active });
    }
    if (businessId) {
      query.andWhere('staff.business_id = :businessId', { businessId });
    }

    return query
      .select([
        'staff.id',
        'staff.name',
        'staff.email',
        'business.id',
        'business.name',
      ])
      .getMany();
  }
}