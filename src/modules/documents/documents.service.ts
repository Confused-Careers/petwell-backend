import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { AwsConfigService } from '../../config/aws.config';
import { Status } from '../../shared/enums/status.enum';
import { Multer } from 'multer';
import * as uuid from 'uuid';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    private awsConfigService: AwsConfigService,
  ) {}

  async uploadDocument(uploadDocumentDto: UploadDocumentDto, file: Multer.File, user: any) {
    const key = `${uploadDocumentDto.type.toLowerCase()}/${uuid.v4()}-${file.originalname}`;
    const uploadResult = await this.awsConfigService.getS3().upload({
      Bucket: this.awsConfigService.getBucket(),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }).promise();

    const document = this.documentRepository.create({
      type: uploadDocumentDto.type,
      name: uploadDocumentDto.name,
      document_url: uploadResult.Location,
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
}