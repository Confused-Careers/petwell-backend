import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './entities/business.entity';
import { Staff } from '../staff/entities/staff.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { BusinessPetMapping } from './entities/business-pet-mapping.entity';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from '../staff/dto/update-staff.dto';
import { CreateBusinessPetMappingDto } from './dto/create-business-pet-mapping.dto';
import { Status } from '../../shared/enums/status.enum';
import { DocumentsService } from '../documents/documents.service';
import { Express } from 'express';
import { DocumentType } from '../../shared/enums/document-type.enum';
import * as bcrypt from 'bcrypt';
import { NodeMailerService } from '@shared/services/nodemailer.service';

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

    try {
      const hashedPassword = await bcrypt.hash(createStaffDto.password, 10);
      const staff = this.staffRepository.create({
        username: createStaffDto.username,
        staff_name: createStaffDto.staff_name,
        email: createStaffDto.email,
        password: hashedPassword,
        role_name: createStaffDto.role_name,
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

    try {
      Object.assign(staff, {
        staff_name: updateStaffDto.staff_name || staff.staff_name,
        email: updateStaffDto.email || staff.email,
        role_name: updateStaffDto.role_name || staff.role_name,
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

  async getStaffList(user: any, page: number = 1, limit: number = 10) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can list staff');
    try {
      const [result, total] = await this.staffRepository.findAndCount({
        where: { business: { id: user.id }, status: Status.Active },
        take: limit,
        skip: (page - 1) * limit,
      });
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
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can add pets');
    const business = await this.businessRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!business) throw new NotFoundException('Business not found');

    const pet = await this.petRepository.findOne({
      where: { id: createBusinessPetMappingDto.pet_id, status: Status.Active },
      relations: ['breed_species', 'breed', 'human_owner', 'profilePictureDocument'],
    });
    if (!pet) throw new NotFoundException('Pet not found');

    let staff: Staff | null = null;
    if (createBusinessPetMappingDto.staff_id) {
      staff = await this.staffRepository.findOne({
        where: { id: createBusinessPetMappingDto.staff_id, status: Status.Active, business: { id: user.id } },
      });
      if (!staff) throw new NotFoundException('Staff not found or not associated with this business');
    }

    const existingMapping = await this.businessPetMappingRepository.findOne({
      where: { business: { id: user.id }, pet: { id: createBusinessPetMappingDto.pet_id } },
    });
    if (existingMapping) throw new BadRequestException('This pet is already associated with the business');

    try {
      const mapping = this.businessPetMappingRepository.create({
        business,
        pet,
        staff,
        title: createBusinessPetMappingDto.title,
        note: createBusinessPetMappingDto.note,
      });

      return await this.businessPetMappingRepository.save(mapping);
    } catch (error) {
      throw new BadRequestException(`Failed to create pet mapping: ${error.message}`);
    }
  }

  async getBusinessPets(user: any, page: number = 1, limit: number = 10) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can access their pet mappings');
    const business = await this.businessRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!business) throw new NotFoundException('Business not found');

    try {
      const [mappings, total] = await this.businessPetMappingRepository.findAndCount({
        where: { business: { id: user.id } },
        relations: ['pet', 'pet.breed_species', 'pet.breed', 'pet.human_owner', 'pet.profilePictureDocument', 'staff'],
        take: limit,
        skip: (page - 1) * limit,
      });

      return {
        data: mappings.map((mapping) => ({
          map_id: mapping.map_id,
          title: mapping.title,
          note: mapping.note,
          created_at: mapping.created_at,
          updated_at: mapping.updated_at,
          pet: mapping.pet,
          staff: mapping.staff ? { id: mapping.staff.id, staff_name: mapping.staff.staff_name } : null,
        })),
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve pet mappings: ${error.message}`);
    }
  }
}