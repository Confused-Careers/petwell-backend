import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Business } from './entities/business.entity';
import { Staff } from '../staff/entities/staff.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { BusinessPetMapping } from './entities/business-pet-mapping.entity';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CreateBusinessPetMappingDto } from './dto/create-business-pet-mapping.dto';
import { Status } from '../../shared/enums/status.enum';
import { DocumentsService } from '../documents/documents.service';
import { Express } from 'express';
import { DocumentType } from '../../shared/enums/document-type.enum';
import * as bcrypt from 'bcrypt';
import { NodeMailerService } from '@shared/services/nodemailer.service';
import { BreedSpecies } from '@modules/pets/entities/breed-species.entity';
import { Breed } from '@modules/pets/entities/breed.entity';
import { Document } from '@modules/documents/entities/document.entity';
import { Team } from '../teams/entities/team.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { Record } from '../records/entities/record.entity';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(PetProfile)
    private petRepository: Repository<PetProfile>,
    @InjectRepository(BusinessPetMapping)
    private businessPetMappingRepository: Repository<BusinessPetMapping>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(HumanOwner)
    private humanOwnerRepository: Repository<HumanOwner>,
    @InjectRepository(Record)
    private recordRepository: Repository<Record>,
    private documentsService: DocumentsService,
    private nodeMailerService: NodeMailerService,
  ) {}

  async getProfile(user: any) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can access their profile');
    const business = await this.businessRepository.findOne({
      where: { id: user.id, status: Status.Active },
      relations: ['profilePictureDocument'],
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async updateProfile(user: any, updateBusinessDto: UpdateBusinessDto, file?: Express.Multer.File) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can update their profile');
    const business = await this.businessRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!business) throw new NotFoundException('Business not found');

    if (file) {
      try {
        const allowedTypes = ['PDF', 'JPG', 'PNG', 'DOC', 'JPEG'];
        const fileType = file.mimetype?.split('/')[1]?.toUpperCase();
        if (!fileType || !allowedTypes.includes(fileType)) {
          throw new BadRequestException('Unsupported file type');
        }
        const document = await this.documentsService.uploadDocument(
          {
            document_name: `profile-picture-${user.id}`,
            document_type: DocumentType.ProfilePicture,
            file_type: fileType as any,
          },
          file,
          user,
        );
        business.profile_picture_document_id = document.id;
      } catch (error) {
        throw new BadRequestException(`File upload failed: ${error.message}`);
      }
    }

    Object.assign(business, {
      business_name: updateBusinessDto.business_name || business.business_name,
      email: updateBusinessDto.email || business.email,
      phone: updateBusinessDto.phone || business.phone,
      website: updateBusinessDto.website || business.website,
      socials: updateBusinessDto.socials || business.socials,
      description: updateBusinessDto.description || business.description,
      address: updateBusinessDto.address || business.address,
      contact_preference: updateBusinessDto.contact_preference || business.contact_preference,
    });

    try {
      return await this.businessRepository.save(business);
    } catch (error) {
      throw new BadRequestException(`Failed to update profile: ${error.message}`);
    }
  }

  async addStaff(user: any, createStaffDto: CreateStaffDto) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can add staff');
    const business = await this.businessRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!business) throw new NotFoundException('Business not found');

    const validRoles = ['Vet', 'Assistant', 'Manager', 'Receptionist', 'Staff'];
    const validAccessLevels = ['Full', 'Editor', 'View', 'Staff'];
    if (createStaffDto.role_name && !validRoles.includes(createStaffDto.role_name)) {
      throw new BadRequestException(`Invalid role_name. Must be one of: ${validRoles.join(', ')}`);
    }
    if (createStaffDto.access_level && !validAccessLevels.includes(createStaffDto.access_level)) {
      throw new BadRequestException(`Invalid access_level. Must be one of: ${validAccessLevels.join(', ')}`);
    }

    // Check for unique email across all repositories
    const emailExists =
      (await this.humanOwnerRepository.findOne({ where: { email: createStaffDto.email } })) ||
      (await this.staffRepository.findOne({ where: { email: createStaffDto.email } })) ||
      (await this.businessRepository.findOne({ where: { email: createStaffDto.email } }));
    if (emailExists) {
      throw new BadRequestException('Email already exists');
    }

    // Check for unique username across HumanOwner and Staff
    const usernameExists =
      (await this.humanOwnerRepository.findOne({ where: { username: createStaffDto.username } })) ||
      (await this.staffRepository.findOne({ where: { username: createStaffDto.username } }));
    if (usernameExists) {
      throw new BadRequestException('Username already exists');
    }

    try {
      const hashedPassword = await bcrypt.hash(createStaffDto.password, 10);
      const staff = this.staffRepository.create({
        username: createStaffDto.username,
        staff_name: createStaffDto.staff_name,
        email: createStaffDto.email,
        password: hashedPassword,
        role_name: createStaffDto.role_name || 'Staff',
        access_level: createStaffDto.access_level || 'Staff',
        business,
      });

      await this.nodeMailerService.shareStaffCredentials(
        staff.email,
        staff.username,
        createStaffDto.password,
      );

      return await this.staffRepository.save(staff);
    } catch (error) {
      throw new BadRequestException(`Failed to add staff: ${error.message}`);
    }
  }

  async updateStaff(user: any, staffId: string, updateStaffDto: UpdateStaffDto) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can update staff');
    const staff = await this.staffRepository.findOne({
      where: { id: staffId, status: Status.Active, business: { id: user.id } },
    });
    if (!staff) throw new NotFoundException('Staff not found or not associated with this business');

    const validRoles = ['Vet', 'Assistant', 'Manager', 'Receptionist', 'Staff'];
    const validAccessLevels = ['Full', 'Editor', 'View', 'Staff'];
    if (updateStaffDto.role_name && !validRoles.includes(updateStaffDto.role_name)) {
      throw new BadRequestException(`Invalid role_name. Must be one of: ${validRoles.join(', ')}`);
    }
    if (updateStaffDto.access_level && !validAccessLevels.includes(updateStaffDto.access_level)) {
      throw new BadRequestException(`Invalid access_level. Must be one of: ${validAccessLevels.join(', ')}`);
    }

    // Check for unique email if updated
    if (updateStaffDto.email && updateStaffDto.email !== staff.email) {
      const emailExists =
        (await this.humanOwnerRepository.findOne({ where: { email: updateStaffDto.email } })) ||
        (await this.staffRepository.findOne({ where: { email: updateStaffDto.email, id: Not(staffId) } })) ||
        (await this.businessRepository.findOne({ where: { email: updateStaffDto.email } }));
      if (emailExists) {
        throw new BadRequestException('Email already exists');
      }
    }

    try {
      Object.assign(staff, {
        staff_name: updateStaffDto.staff_name || staff.staff_name,
        email: updateStaffDto.email || staff.email,
        role_name: updateStaffDto.role_name || staff.role_name,
        access_level: updateStaffDto.access_level || staff.access_level,
      });

      return await this.staffRepository.save(staff);
    } catch (error) {
      throw new BadRequestException(`Failed to update staff: ${error.message}`);
    }
  }

  async removeStaff(user: any, staffId: string) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can remove staff');
    const staff = await this.staffRepository.findOne({
      where: { id: staffId, status: Status.Active, business: { id: user.id } },
    });
    if (!staff) throw new NotFoundException('Staff not found or not associated with this business');

    try {
      await this.staffRepository.remove(staff);
      return { message: 'Staff removed successfully' };
    } catch (error) {
      throw new BadRequestException(`Failed to remove staff: ${error.message}`);
    }
  }

  async getStaffList(
    user: any,
    page: number = 1,
    limit: number = 10,
    role?: string,
    access_level?: string,
  ) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can list staff');

    const validRoles = ['Vet', 'Assistant', 'Manager', 'Receptionist', 'Staff'];
    const validAccessLevels = ['Full', 'Editor', 'View', 'Staff'];

    try {
      let query = this.staffRepository
        .createQueryBuilder('staff')
        .where('staff.businessId = :businessId', { businessId: user.id })
        .andWhere('staff.status = :status', { status: Status.Active });

      if (role && validRoles.includes(role)) {
        query = query.andWhere('staff.role_name = :role', { role });
      } else if (role) {
        throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      if (access_level && validAccessLevels.includes(access_level)) {
        query = query.andWhere('staff.access_level = :accessLevel', { accessLevel: access_level });
      } else if (access_level) {
        throw new BadRequestException(`Invalid access level. Must be one of: ${validAccessLevels.join(', ')}`);
      }

      const [result, total] = await query
        .take(limit)
        .skip((page - 1) * limit)
        .getManyAndCount();

      return {
        data: result,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve staff list: ${error.message}`);
    }
  }

  async addPet(user: any, createBusinessPetMappingDto: CreateBusinessPetMappingDto) {
    if (user.entityType !== 'Business' && user.entityType !== 'Staff') throw new UnauthorizedException('You are not authorized to add pets');

    // Validate that at least one of pet_id or qr_code_id is provided
    if (!createBusinessPetMappingDto.pet_id && !createBusinessPetMappingDto.qr_code_id) {
      throw new BadRequestException('Either pet_id or qr_code_id must be provided');
    }

    const business = await this.businessRepository.findOne({
      where: user.entityType === 'Business'
        ? { id: user.id, status: Status.Active }
        : { id: user.business_id, status: Status.Active },
    });
    if (!business) throw new NotFoundException('Business not found');

    let pet: PetProfile | null = null;
    if (createBusinessPetMappingDto.pet_id) {
      pet = await this.petRepository.findOne({
        where: { id: createBusinessPetMappingDto.pet_id, status: Status.Active },
        relations: ['breed_species', 'breed', 'human_owner', 'profilePictureDocument'],
      });
    } else if (createBusinessPetMappingDto.qr_code_id) {
      pet = await this.petRepository.findOne({
        select: { pet_name: true, id: true },
        where: { qr_code_id: createBusinessPetMappingDto.qr_code_id, status: Status.Active },
        relations: ['breed_species', 'breed', 'human_owner', 'profilePictureDocument'],
      });
    }

    if (!pet) throw new NotFoundException('Pet not found');

    let staff: Staff | null = null;
    if (createBusinessPetMappingDto.staff_id) {
      staff = await this.staffRepository.findOne({
        where: { id: createBusinessPetMappingDto.staff_id, status: Status.Active, business: { id: business.id } },
      });
      if (!staff) throw new NotFoundException('Staff not found or not associated with this business');
    }

    const existingMapping = await this.businessPetMappingRepository.findOne({
      where: {
        business: { id: business.id },
        pet: { id: pet.id },
        status: Status.Active,
      },
    });
    if (existingMapping) throw new BadRequestException('This pet is already associated with the business');

    // Check if Team exists, create if not
    const humanOwner = await this.humanOwnerRepository.findOne({
      where: { id: pet.human_owner.id, status: Status.Active },
    });
    if (!humanOwner) throw new NotFoundException('Human owner not found');

    let team = await this.teamRepository.findOne({
      where: {
        human_owner: { id: humanOwner.id },
        pet: { id: pet.id },
        business: { id: business.id },
        status: Status.Active,
      },
    });

    if (!team) {
      team = this.teamRepository.create({
        human_owner: humanOwner,
        pet,
        business,
      });
      await this.teamRepository.save(team);
    }

    try {
      const mapping = this.businessPetMappingRepository.create({
        business,
        pet,
        staff: staff || null,
        note: createBusinessPetMappingDto.note || null,
        title: createBusinessPetMappingDto.title || `Auto-generated mapping for ${pet.pet_name} with ${business.business_name}`,
      });
      await this.businessPetMappingRepository.save(mapping);
      return pet;
    } catch (error) {
      throw new BadRequestException(`Failed to create pet mapping: ${error.message}`);
    }
  }

  async getBusinessPets(user: any, page: number = 1, limit: number = 10) {
    if (user.entityType !== 'Business' && user.entityType !== 'Staff') {
      throw new UnauthorizedException('You are not authorized to view pets');
    }

    let businessId: string;
    if (user.entityType === 'Business') {
      businessId = user.id;
    } else if (user.entityType === 'Staff') {
      const staff = await this.staffRepository.findOne({
        where: { id: user.id, status: Status.Active },
        relations: ['business'],
      });
      if (!staff || !staff.business) throw new NotFoundException('Staff or associated business not found');
      businessId = staff.business.id;
    } else {
      throw new UnauthorizedException('Invalid user entity type');
    }

    const business = await this.businessRepository.findOne({
      where: { id: businessId, status: Status.Active },
    });
    if (!business) throw new NotFoundException('Business not found');

    try {
      // 1. Get all mappings for this business with valid pets and businesses
      let mappingQuery = this.businessPetMappingRepository
        .createQueryBuilder('mapping')
        .innerJoinAndSelect('mapping.business', 'business', 'business.status = :businessStatus', { businessStatus: Status.Active })
        .innerJoinAndSelect('mapping.pet', 'pet', 'pet.status = :petStatus', { petStatus: Status.Active })
        .leftJoinAndSelect('mapping.staff', 'staff')
        .leftJoinAndSelect('pet.human_owner', 'human_owner')
        .leftJoinAndSelect('pet.breed_species', 'breed_species')
        .leftJoinAndSelect('pet.breed', 'breed')
        .leftJoinAndSelect('pet.profilePictureDocument', 'profilePictureDocument')
        .where('mapping.business_id = :businessId AND mapping.status = :status', { businessId, status: Status.Active });

      if (user.entityType === 'Staff') {
        mappingQuery = mappingQuery.andWhere('mapping.staff_id = :staffId OR mapping.staff_id IS NULL', { staffId: user.id });
      }

      mappingQuery = mappingQuery.orderBy('mapping.created_at', 'DESC').take(limit).skip((page - 1) * limit);

      const [mappings, total] = await mappingQuery.getManyAndCount();

      // 2. Get all pet IDs
      const petIds = mappings.map(m => m.pet.id).filter(id => id);

      // 3. Get all records for these pets and this business
      let recordsQuery = this.recordRepository
        .createQueryBuilder('record')
        .innerJoinAndSelect('record.pet', 'pet', 'pet.status = :petStatus', { petStatus: Status.Active })
        .innerJoinAndSelect('record.business', 'business', 'business.status = :businessStatus', { businessStatus: Status.Active })
        .leftJoinAndSelect('record.staff', 'staff')
        .where('record.business_id = :businessId', { businessId })
        .andWhere('record.status = :status', { status: Status.Active });

      if (petIds.length > 0) {
        recordsQuery = recordsQuery.andWhere('record.pet_id IN (:...petIds)', { petIds });
      } else {
        recordsQuery = recordsQuery.andWhere('1 = 0');
      }

      const records = await recordsQuery.orderBy('record.created_at', 'DESC').getMany();

      // 4. Map latest record for each pet
      const latestRecordMap = new Map<string, Record>();
      for (const record of records) {
        if (record.pet && !latestRecordMap.has(record.pet.id)) {
          latestRecordMap.set(record.pet.id, record);
        }
      }

      // 5. Build result
      const results = mappings.map(mapping => {
        const pet = mapping.pet;
        const latestRecord = latestRecordMap.get(pet.id);

        const result = {
          business_id: mapping.business.id,
          created_at: mapping.created_at,
          map_id: mapping.map_id,
          note: mapping.note,
          pet_id: pet.id,
          staff_id: mapping.staff ? mapping.staff.id : null,
          status: mapping.status,
          title: mapping.title,
          updated_at: mapping.updated_at,
          pet_name: pet.pet_name,
          breed_name: pet.breed ? pet.breed.breed_name : null,
          staff_name: mapping.staff ? mapping.staff.staff_name : null,
          human_owner_name: pet.human_owner ? pet.human_owner.human_owner_name : null,
          human_owner_phone: pet.human_owner ? pet.human_owner.phone : null,
          species_name: pet.breed_species ? pet.breed_species.species_name : null,
          document_url: pet.profilePictureDocument ? pet.profilePictureDocument.document_url : null,
          last_visit: latestRecord ? latestRecord.created_at : null,
          record_note: latestRecord ? latestRecord.note : null,
          doctor_name: latestRecord && latestRecord.staff ? latestRecord.staff.staff_name : null,
        };

        return result;
      });

      return {
        data: results,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve pet mappings: ${error.message}`);
    }
  }
}
