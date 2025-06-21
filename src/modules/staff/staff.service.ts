import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { Status } from '../../shared/enums/status.enum';
import { DocumentsService } from '../documents/documents.service';
import { Multer } from 'multer';
import { DocumentType } from '../../shared/enums/document-type.enum';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    private documentsService: DocumentsService,
  ) {}

  async getProfile(user: any) {
    if (user.entityType !== 'Staff') throw new UnauthorizedException('Only staff can access their profile');
    const staff = await this.staffRepository.findOne({
      where: { id: user.id, status: Status.Active },
      relations: ['business', 'profile_picture_document'],
    });
    if (!staff) throw new NotFoundException('Staff not found');
    return staff;
  }

  async updateProfile(user: any, updateStaffDto: UpdateStaffDto, file?: Multer.File) {
    if (user.entityType !== 'Staff') throw new UnauthorizedException('Only staff can update their profile');
    const staff = await this.staffRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!staff) throw new NotFoundException('Staff not found');

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
      staff.profile_picture_document_id = document.id;
    }

    Object.assign(staff, {
      name: updateStaffDto.name || staff.name,
      email: updateStaffDto.email || staff.email,
      role: updateStaffDto.role || staff.role,
    });

    return this.staffRepository.save(staff);
  }
}