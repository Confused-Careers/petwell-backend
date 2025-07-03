import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Record } from './entities/record.entity';
import { BusinessPetMapping } from '../businesses/entities/business-pet-mapping.entity';
import { Business } from '../businesses/entities/business.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { Staff } from '../staff/entities/staff.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { Breed } from '../pets/entities/breed.entity';
import { BreedSpecies } from '../pets/entities/breed-species.entity';
import { Document } from '../documents/entities/document.entity';
import { CreateRecordDto } from './dto/create-record.dto';
import { FilterRecordsDto } from './dto/filter-records.dto';
import { Status } from '../../shared/enums/status.enum';

@Injectable()
export class RecordsService {
  constructor(
    @InjectRepository(Record)
    private recordRepository: Repository<Record>,
    @InjectRepository(BusinessPetMapping)
    private businessPetMappingRepository: Repository<BusinessPetMapping>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(PetProfile)
    private petRepository: Repository<PetProfile>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
  ) {}

  async createRecord(user: any, createRecordDto: CreateRecordDto) {
    if (user.entityType !== 'Business' && user.entityType !== 'Staff') {
      throw new UnauthorizedException('Only businesses or staff can create records');
    }

    let businessId: string;
    if (user.entityType === 'Business') {
      businessId = user.id;
    } else {
      const staff = await this.staffRepository.findOne({
        where: { id: user.id, status: Status.Active },
        relations: ['business'],
      });
      if (!staff || !staff.business) {
        throw new NotFoundException('Staff or associated business not found');
      }
      businessId = staff.business.id;
    }

    const business = await this.businessRepository.findOne({
      where: { id: businessId, status: Status.Active },
    });
    if (!business) throw new NotFoundException('Business not found');

    const pet = await this.petRepository.findOne({
      where: { id: createRecordDto.pet_id, status: Status.Active },
    });
    if (!pet) throw new NotFoundException('Pet not found');

    let staff: Staff | null = null;
    if (createRecordDto.staff_id) {
      staff = await this.staffRepository.findOne({
        where: { id: createRecordDto.staff_id, status: Status.Active, business: { id: businessId } },
      });
      if (!staff) throw new NotFoundException('Staff not found or not associated with this business');
    }

    const mapping = await this.businessPetMappingRepository.findOne({
      where: {
        business: { id: businessId },
        pet: { id: createRecordDto.pet_id },
        status: Status.Active,
      },
    });
    if (!mapping) {
      throw new BadRequestException('No valid business-pet mapping exists for this record');
    }

    try {
      const record = this.recordRepository.create({
        business,
        pet,
        staff: staff || null,
        note: createRecordDto.note || null,
        title: createRecordDto.title || `Visit for ${pet.pet_name} at ${business.business_name}`,
        status: Status.Active,
      });
      return await this.recordRepository.save(record);
    } catch (error) {
      throw new BadRequestException(`Failed to create record: ${error.message}`);
    }
  }

  async getAllRecords(user: any, filterRecordsDto: FilterRecordsDto) {
    if (user.entityType !== 'Business' && user.entityType !== 'Staff') {
      throw new UnauthorizedException('Only businesses or staff can view records');
    }

    let businessId: string;
    if (user.entityType === 'Business') {
      businessId = user.id;
    } else {
      const staff = await this.staffRepository.findOne({
        where: { id: user.id, status: Status.Active },
        relations: ['business'],
      });
      if (!staff || !staff.business) {
        throw new NotFoundException('Staff or associated business not found');
      }
      businessId = staff.business.id;
    }

    const page = parseInt(filterRecordsDto.page || '1', 10);
    const limit = parseInt(filterRecordsDto.limit || '10', 10);

    try {
      let query = this.recordRepository
        .createQueryBuilder('record')
        .select([
          'record.id AS id',
          'record.pet_id AS pet_id',
          'record.created_at AS last_visited',
          'record.note AS note',
          'record.title AS title',
          'pet.pet_name AS pet_name',
          'human_owner.human_owner_name AS owner_name',
          'human_owner.phone AS owner_phone',
          'breed.breed_name AS breed_name',
          'breed_species.species_name AS species_name',
          'staff.staff_name AS doctor_visited',
          'profilePictureDocument.document_url AS pet_image',
          'mapping.created_at AS added_on',
          'true AS is_under_care',
        ])
        .innerJoin(PetProfile, 'pet', 'record.pet_id = pet.id')
        .innerJoin(HumanOwner, 'human_owner', 'pet.humanOwnerId = human_owner.id')
        .leftJoin(BreedSpecies, 'breed_species', 'pet.breedSpeciesId = breed_species.id')
        .leftJoin(Breed, 'breed', 'pet.breedId = breed.id')
        .leftJoin(Staff, 'staff', 'record.staff_id = staff.id')
        .leftJoin(Document, 'profilePictureDocument', 'pet.profile_picture_document_id = profilePictureDocument.id')
        .innerJoin(
          BusinessPetMapping,
          'mapping',
          'mapping.pet_id = pet.id AND mapping.business_id = record.business_id AND mapping.status::text = :status',
          { status: Status.Active },
        )
        .where('record.business_id = :businessId AND record.status::text = :status', { businessId, status: Status.Active });

      if (filterRecordsDto.species_id) {
        query = query.andWhere('pet.breedSpeciesId = :speciesId', { speciesId: filterRecordsDto.species_id });
      }

      if (filterRecordsDto.doctor_id) {
        query = query.andWhere('record.staff_id = :doctorId', { doctorId: filterRecordsDto.doctor_id });
      }

      if (filterRecordsDto.time_period) {
        const now = new Date();
        let startDate: Date;
        if (filterRecordsDto.time_period === 'this_week') {
          startDate = new Date(now.setDate(now.getDate() - now.getDay()));
          startDate.setHours(0, 0, 0, 0);
        } else if (filterRecordsDto.time_period === 'this_month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filterRecordsDto.time_period === 'last_3_months') {
          startDate = new Date(now.setMonth(now.getMonth() - 3));
        }
        query = query.andWhere('record.created_at >= :startDate', { startDate });
      }

      if (user.entityType === 'Staff') {
        query = query.andWhere('record.staff_id = :staffId', { staffId: user.id });
      }

      // Get total count
      const total = await query.getCount();

      // Get paginated results
      const results = await query
        .orderBy('record.created_at', 'DESC')
        .take(limit)
        .skip((page - 1) * limit)
        .getRawMany();

      return {
        data: results,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve records: ${error.message}`);
    }
  }

  async getVets(user: any, page: number = 1, limit: number = 10) {
    if (user.entityType !== 'Business' && user.entityType !== 'Staff') {
      throw new UnauthorizedException('Only businesses or staff can list vets');
    }

    let businessId: string;
    if (user.entityType === 'Business') {
      businessId = user.id;
    } else {
      const staff = await this.staffRepository.findOne({
        where: { id: user.id, status: Status.Active },
        relations: ['business'],
      });
      if (!staff || !staff.business) {
        throw new NotFoundException('Staff or associated business not found');
      }
      businessId = staff.business.id;
    }

    try {
      const [results, total] = await this.staffRepository
        .createQueryBuilder('staff')
        .where('staff.businessId = :businessId AND staff.status::text = :status AND staff.role_name = :roleName', {
          businessId,
          status: Status.Active,
          roleName: 'Vet',
        })
        .select(['staff.id', 'staff.staff_name', 'staff.email', 'staff.phone', 'staff.created_at', 'staff.updated_at'])
        .take(limit)
        .skip((page - 1) * limit)
        .getManyAndCount();

      return {
        data: results,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve vets: ${error.message}`);
    }
  }

  async getRecentRecords(user: any, page: number = 1, limit: number = 10) {
    if (user.entityType !== 'Business' && user.entityType !== 'Staff') {
      throw new UnauthorizedException('Only businesses or staff can view recent records');
    }

    let businessId: string;
    if (user.entityType === 'Business') {
      businessId = user.id;
    } else {
      const staff = await this.staffRepository.findOne({
        where: { id: user.id, status: Status.Active },
        relations: ['business'],
      });
      if (!staff || !staff.business) {
        throw new NotFoundException('Staff or associated business not found');
      }
      businessId = staff.business.id;
    }

    try {
      let query = this.recordRepository
        .createQueryBuilder('record')
        .select([
          'record.id AS id',
          'record.created_at AS last_visited',
          'record.note AS note',
          'record.title AS title',
          'pet.pet_name AS pet_name',
          'human_owner.human_owner_name AS owner_name',
          'human_owner.phone AS owner_phone',
          'breed.breed_name AS breed_name',
          'breed_species.species_name AS species_name',
          'staff.staff_name AS doctor_visited',
          'profilePictureDocument.document_url AS pet_image',
          'mapping.created_at AS added_on',
        ])
        .innerJoin(PetProfile, 'pet', 'record.pet_id = pet.id')
        .innerJoin(HumanOwner, 'human_owner', 'pet.humanOwnerId = human_owner.id')
        .leftJoin(BreedSpecies, 'breed_species', 'pet.breedSpeciesId = breed_species.id')
        .leftJoin(Breed, 'breed', 'pet.breedId = breed.id')
        .leftJoin(Staff, 'staff', 'record.staff_id = staff.id')
        .leftJoin(Document, 'profilePictureDocument', 'pet.profile_picture_document_id = profilePictureDocument.id')
        .innerJoin(
          BusinessPetMapping,
          'mapping',
          'mapping.pet_id = pet.id AND mapping.business_id = record.business_id AND mapping.status::text = :status',
          { status: Status.Active },
        )
        .where('record.business_id = :businessId AND record.status::text = :status', { businessId, status: Status.Active })
        .andWhere('record.created_at = (SELECT MAX(r.created_at) FROM records r WHERE r.pet_id = record.pet_id AND r.business_id = record.business_id AND r.status::text = :status)', {
          status: Status.Active,
        });

      if (user.entityType === 'Staff') {
        query = query.andWhere('record.staff_id = :staffId', { staffId: user.id });
      }

      query = query.orderBy('record.created_at', 'DESC');

      const [results, total] = await query
        .take(limit)
        .skip((page - 1) * limit)
        .getRawMany();

      return {
        data: results,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve recent records: ${error.message}`);
    }
  }
}