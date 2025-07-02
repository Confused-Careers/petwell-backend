import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { HumanOwner } from '@modules/human-owners/entities/human-owner.entity';
import { BreedSpecies } from '@modules/pets/entities/breed-species.entity';
import { Breed } from '@modules/pets/entities/breed.entity';
import { Document } from '@modules/documents/entities/document.entity';

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
    private documentsService: DocumentsService,
    private nodeMailerService: NodeMailerService,
  ) { }

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
        .where('staff.business_id = :businessId', { businessId: user.id })
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
    const business = await this.businessRepository.findOne({
      where: user.entityType === 'Business'
        ? { id: user.id, status: Status.Active }
        : { id: user.business_id, status: Status.Active },
    });
    if (!business) throw new NotFoundException('Business not found');


    let pet = null;
    if (createBusinessPetMappingDto['pet_id']) {
      pet = await this.petRepository.findOne({
        where: { id: createBusinessPetMappingDto.pet_id, status: Status.Active },
        relations: ['breed_species', 'breed', 'human_owner', 'profilePictureDocument'],
      });
    } else {
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
      where: { business: { id: business.id }, pet: { id: pet.id } },
    });
    if (existingMapping) throw new BadRequestException('This pet is already associated with the business');

    try {
      const mapping = this.businessPetMappingRepository.create({
        business,
        pet,
        staff: staff || null,
        title: createBusinessPetMappingDto.title || null,
        note: createBusinessPetMappingDto.note || null,
      });
      await this.businessPetMappingRepository.save(mapping)
      return pet;
    } catch (error) {
      throw new BadRequestException(`Failed to create pet mapping: ${error.message}`);
    }
  }

  async getBusinessPets(user: any, page: number = 1, limit: number = 10) {
    if (user.entityType !== 'Business' && user.entityType !== 'Staff') throw new UnauthorizedException('You are not authorized to view pets');

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
      let query = this.businessPetMappingRepository
        .createQueryBuilder('mapping')
        .select([
          "mapping.business_id AS business_id",
"mapping.created_at AS created_at",
"mapping.map_id AS map_id",
"mapping.note AS note",
"mapping.pet_id AS pet_id",
"mapping.staff_id AS staff_id",
"mapping.status AS status",
"mapping.title AS title",
"mapping.updated_at AS updated_at",
"pet.pet_name AS pet_name",
"breed.breed_name AS breed_name",
"staff.staff_name AS staff_name",
"human_owner.human_owner_name AS human_owner_name",
"breed_species.species_name AS species_name",
"profilePictureDocument.document_url AS document_url",


        ])
        .innerJoin(PetProfile,'pet','mapping.pet_id=pet.id')
        .leftJoin(Staff,'staff','mapping.staff_id=staff.id')
        .innerJoin(HumanOwner,'human_owner','pet.humanOwnerId=human_owner.id')
        .leftJoin(BreedSpecies,'breed_species','pet.breedSpeciesId=breed_species.id')
        .leftJoin(Breed,'breed','pet.breedSpeciesId=breed.id')
        .leftJoin(Document,'profilePictureDocument','pet.profile_picture_document_id=profilePictureDocument.id')
        .where('mapping.business_id = :businessId AND mapping.status=:status', { businessId,status:Status.Active });
return query.getRawMany();
      if (user.entityType === 'Staff') {
        query = query.andWhere('mapping.staff_id = :staffId', { staffId: user.id });
      }

      query = query.orderBy('mapping.staff_id', 'ASC', 'NULLS LAST');
      console.log(query.getQueryAndParameters())

      const [mappings, total] = await query
        .take(limit)
        .skip((page - 1) * limit)
        .getManyAndCount();

      // return {
      //   data: mappings.map((mapping) => ({
      //     map_id: mapping.map_id,
      //     title: mapping.title,
      //     note: mapping.note,
      //     created_at: mapping.created_at,
      //     updated_at: mapping.updated_at,
      //     pet: mapping.pet,
      //     staff: mapping.staff ? { id: mapping.staff.id, staff_name: mapping.staff.staff_name } : null,
      //   })),
      //   total,
      //   page,
      //   limit,
      // };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve pet mappings: ${error.message}`);
    }
  }
}