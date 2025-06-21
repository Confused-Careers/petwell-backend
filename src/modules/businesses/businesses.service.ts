import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './entities/business.entity';
import { Staff } from '../staff/entities/staff.entity';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from '../staff/dto/update-staff.dto';
import { Status } from '../../shared/enums/status.enum';
import { DocumentsService } from '../documents/documents.service';
import { Multer } from 'multer';
import { DocumentType } from '../../shared/enums/document-type.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
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

  async updateProfile(user: any, updateBusinessDto: UpdateBusinessDto, file?: Multer.File) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can update their profile');
    const business = await this.businessRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!business) throw new NotFoundException('Business not found');

    if (file) {
      const document = await this.documentsService.uploadDocument(
        {
          name: `profile-picture-${user.id}`,
          type: DocumentType.ProfilePicture,
          file_type: file.mimetype.split('/')[1].toUpperCase() as any,
        },
        file,
        user,
      );
      business.profile_picture_document_id = document.id;
    }

    Object.assign(business, {
      name: updateBusinessDto.name || business.name,
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
      name: createStaffDto.name,
      email: createStaffDto.email,
      password: hashedPassword,
      role: createStaffDto.role,
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
      name: updateStaffDto.name || staff.name,
      email: updateStaffDto.email || staff.email,
      role: updateStaffDto.role || staff.role,
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

  async getStaffList(user: any) {
    if (user.entityType !== 'Business') throw new UnauthorizedException('Only businesses can list staff');
    return this.staffRepository.find({
      where: { business: { id: user.id }, status: Status.Active },
    });
  }
}