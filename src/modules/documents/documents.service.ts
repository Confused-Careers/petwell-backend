import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { AwsService } from '../../aws/aws.service';
import { Status } from '../../shared/enums/status.enum';
import { Express } from 'express';
import * as uuid from 'uuid';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Business } from '../businesses/entities/business.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';

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
    @InjectRepository(PetProfile)
    private petRepository: Repository<PetProfile>,
    private awsService: AwsService,
  ) {}

  async uploadDocument(
    uploadDocumentDto: UploadDocumentDto,
    file: Express.Multer.File,
    user: User,
    petId?: string,
    manager?: EntityManager,
  ) {
    // Validate file properties
    if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
      console.error('File validation failed:', {
        originalname: file?.originalname || 'unknown',
        hasBuffer: !!file?.buffer,
        isBuffer: Buffer.isBuffer(file?.buffer),
        bufferSize: file?.buffer?.length,
      });
      throw new BadRequestException(`Invalid file: ${file?.originalname || 'unknown'} has no valid buffer`);
    }
    if (!file.originalname || !file.mimetype) {
      console.error('File metadata missing:', {
        originalname: file?.originalname,
        mimetype: file?.mimetype,
      });
      throw new BadRequestException(`Invalid file: ${file?.originalname || 'unknown'} is missing originalname or mimetype`);
    }

    const key = `${uploadDocumentDto.document_type.toLowerCase()}/${uuid.v4()}-${file.originalname}`;
    let uploadResult: string;
    try {
      uploadResult = await this.awsService.uploadFileToS3(key, file.originalname, file);
    } catch (error) {
      console.error('S3 upload error:', {
        file: file.originalname,
        error: error.message,
        stack: error.stack,
      });
      throw new BadRequestException(`Failed to upload file ${file.originalname} to S3: ${error.message}`);
    }

    // Use manager if provided, else fallback to repository
    const repo = manager ? manager.getRepository(Document) : this.documentRepository;

    const document = repo.create({
      document_type: uploadDocumentDto.document_type,
      document_name: uploadDocumentDto.document_name,
      document_url: uploadResult,
      file_type: uploadDocumentDto.file_type,
      description: uploadDocumentDto.description,
      license_reference: uploadDocumentDto.license_reference,
      human_owner: user.entityType === 'HumanOwner' ? { id: user.id } : null,
      staff: user.entityType === 'Staff' ? { id: user.id } : null,
      business: user.entityType === 'Business' ? { id: user.id } : null,
      pet: petId ? { id: petId } : null,
    });

    return repo.save(document);
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

    // Validate file properties
    if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
      console.error('File validation failed in update:', {
        originalname: file?.originalname || 'unknown',
        hasBuffer: !!file?.buffer,
        isBuffer: Buffer.isBuffer(file?.buffer),
        bufferSize: file?.buffer?.length,
      });
      throw new BadRequestException(`Invalid file: ${file?.originalname || 'unknown'} has no valid buffer`);
    }
    if (!file.originalname || !file.mimetype) {
      console.error('File metadata missing in update:', {
        originalname: file?.originalname,
        mimetype: file?.mimetype,
      });
      throw new BadRequestException(`Invalid file: ${file?.originalname || 'unknown'} is missing originalname or mimetype`);
    }

    const key = `${uploadDocumentDto.document_type.toLowerCase()}/${uuid.v4()}-${file.originalname}`;
    let uploadResult: string;
    try {
      uploadResult = await this.awsService.uploadFileToS3(key, file.originalname, file);
    } catch (error) {
      console.error('S3 update error:', {
        file: file.originalname,
        error: error.message,
        stack: error.stack,
      });
      throw new BadRequestException(`Failed to update file ${file.originalname} to S3: ${error.message}`);
    }

    let pet: PetProfile | null = document.pet;
    if (uploadDocumentDto.pet_id) {
      pet = await this.petRepository.findOne({ where: { id: uploadDocumentDto.pet_id, status: Status.Active } });
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${uploadDocumentDto.pet_id} not found`);
      }
    } else if (uploadDocumentDto.pet_id === null) {
      pet = null;
    }

    document.document_type = uploadDocumentDto.document_type;
    document.document_name = uploadDocumentDto.document_name;
    document.document_url = uploadResult;
    document.file_type = uploadDocumentDto.file_type;
    document.description = uploadDocumentDto.description;
    document.license_reference = uploadDocumentDto.license_reference;
    document.pet = pet;

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