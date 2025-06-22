import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { AwsService } from '../../aws/aws.service';
import { Status } from '../../shared/enums/status.enum';
import { Express } from 'express';
import * as uuid from 'uuid';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Business } from '../businesses/entities/business.entity';

interface User {
  id: string;
  entityType: 'HumanOwner' | 'Staff' | 'Business';
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(HumanOwner)
    private humanOwnerRepository: Repository<HumanOwner>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    private awsService: AwsService,
  ) {}

  async uploadDocument(uploadDocumentDto: UploadDocumentDto, file: Express.Multer.File, user: User) {
    const key = `${uploadDocumentDto.document_type.toLowerCase()}/${uuid.v4()}-${file.originalname}`;
    const uploadResult = await this.awsService.uploadFileToS3(key, file.originalname, file);

    const document = this.documentRepository.create({
      document_type: uploadDocumentDto.document_type,
      document_name: uploadDocumentDto.document_name,
      document_url: uploadResult,
      file_type: uploadDocumentDto.file_type,
      description: uploadDocumentDto.description,
      license_reference: uploadDocumentDto.license_reference,
      human_owner: user.entityType === 'HumanOwner' ? { id: user.id } : null,
      staff: user.entityType === 'Staff' ? { id: user.id } : null,
      business: user.entityType === 'Business' ? { id: user.id } : null,
    });

    return this.documentRepository.save(document);
  }

  async getDocument(id: string) {
    const document = await this.documentRepository.findOne({
      where: { id, status: Status.Active },
      relations: ['human_owner', 'staff', 'business', 'pet'],
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async updateDocument(id: string, uploadDocumentDto: UploadDocumentDto, file: Express.Multer.File, user: User) {
    const document = await this.getDocument(id);
    const key = `${uploadDocumentDto.document_type.toLowerCase()}/${uuid.v4()}-${file.originalname}`;
    const uploadResult = await this.awsService.uploadFileToS3(key, file.originalname, file);

    document.document_type = uploadDocumentDto.document_type;
    document.document_name = uploadDocumentDto.document_name;
    document.document_url = uploadResult;
    document.file_type = uploadDocumentDto.file_type;
    document.description = uploadDocumentDto.description;
    document.license_reference = uploadDocumentDto.license_reference;

    if (user.entityType === 'HumanOwner') {
      const humanOwner = await this.humanOwnerRepository.findOne({ where: { id: user.id } });
      if (!humanOwner) throw new NotFoundException('HumanOwner not found');
      document.human_owner = humanOwner;
    } else if (user.entityType === 'Staff') {
      const staff = await this.staffRepository.findOne({ where: { id: user.id } });
      if (!staff) throw new NotFoundException('Staff not found');
      document.staff = staff;
    } else if (user.entityType === 'Business') {
      const business = await this.businessRepository.findOne({ where: { id: user.id } });
      if (!business) throw new NotFoundException('Business not found');
      document.business = business;
    }

    return this.documentRepository.save(document);
  }
}