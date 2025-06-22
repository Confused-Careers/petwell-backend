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
  ) {}

  async getProfile(user: any) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can access their profile');
    const business = await this.businessRepository.findOne({
      where: { id: user.id, status: Status.Active },
      relations: ['profile_picture_document'],
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async updateProfile(user: any, updateBusinessDto: UpdateBusinessDto, file?: Express.Multer.File) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can update their profile');
    const business = await this.businessRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!business) throw new NotFoundException('Business not found');

    if (file) {
      const document = await this.documentsService.uploadDocument(
        {
          document_name: `profile-picture-${user.id}`,
          document_type: DocumentType.ProfilePicture,
          file_type: file.mimetype.split('/')[1].toUpperCase() as any,
        },
        file,
        user,
      );
      business.profile_picture_document_id = document.id;
    }

    Object.assign(business, {
      business_name: updateBusinessDto.business_name || business.business_name,
      email: updateBusinessDto.email || business.email,
      phone: updateBusinessDto.phone || business.phone,
      website: updateBusinessDto.website || business.website,
      socials: updateBusinessDto.socials || business.socials,
      description: updateBusinessDto.description || business.description,
    });

    return this.businessRepository.save(business);
  }

  async addStaff(user: any, createStaffDto: CreateStaffDto) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can add staff');
    const business = await this.businessRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!business) throw new NotFoundException('Business not found');

    const hashedPassword = await bcrypt.hash(createStaffDto.password, 10);
    const staff = this.staffRepository.create({
      username: createStaffDto.username,
      staff_name: createStaffDto.staff_name,
      email: createStaffDto.email,
      password: hashedPassword,
      role_name: createStaffDto.role_name,
      business,
    });

    return this.staffRepository.save(staff);
  }

  async updateStaff(user: any, staffId: string, updateStaffDto: UpdateStaffDto) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can update staff');
    const staff = await this.staffRepository.findOne({
      where: { id: staffId, status: Status.Active, business: { id: user.id } },
    });
    if (!staff) throw new NotFoundException('Staff not found or not associated with this business');

    Object.assign(staff, {
      staff_name: updateStaffDto.staff_name || staff.staff_name,
      email: updateStaffDto.email || staff.email,
      role_name: updateStaffDto.role_name || staff.role_name,
    });

    return this.staffRepository.save(staff);
  }

  async removeStaff(user: any, staffId: string) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can remove staff');
    const staff = await this.staffRepository.findOne({
      where: { id: staffId, status: Status.Active, business: { id: user.id } },
    });
    if (!staff) throw new NotFoundException('Staff not found or not associated with this business');

    staff.status = Status.Inactive;
    return this.staffRepository.save(staff);
  }

  async getStaffList(user: any, page: number = 1, limit: number = 10) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can list staff');
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
  }

  async addPet(user: any, createBusinessPetMappingDto: CreateBusinessPetMappingDto) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can add pets');
    const business = await this.businessRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!business) throw new NotFoundException('Business not found');

    const pet = await this.petRepository.findOne({ where: { id: createBusinessPetMappingDto.pet_id, status: Status.Active } });
    if (!pet) throw new NotFoundException('Pet not found');

    const existingMapping = await this.businessPetMappingRepository.findOne({
      where: { business: { id: user.id }, pet: { id: createBusinessPetMappingDto.pet_id } },
    });
    if (existingMapping)
      throw new BadRequestException(
        'This pet is already associated with the business',
      );

    const mapping = this.businessPetMappingRepository.create({
      business,
      pet,
      title: createBusinessPetMappingDto.title,
      note: createBusinessPetMappingDto.note,
    });

    return this.businessPetMappingRepository.save(mapping);
  }
}