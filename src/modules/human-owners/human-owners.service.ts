import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HumanOwner } from './entities/human-owner.entity';
import { UpdateHumanOwnerDto } from './dto/update-human-owner.dto';
import { Status } from '../../shared/enums/status.enum';
import { DocumentsService } from '../documents/documents.service';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { Express } from 'express';
import { DocumentType } from '../../shared/enums/document-type.enum';

@Injectable()
export class HumanOwnersService {
  constructor(
    @InjectRepository(HumanOwner)
    private humanOwnerRepository: Repository<HumanOwner>,
    @InjectRepository(PetProfile)
    private petRepository: Repository<PetProfile>,
    private documentsService: DocumentsService,
  ) {}

  async getProfile(user: any) {
    if (user.entityType !== 'HumanOwner') throw new UnauthorizedException('Only human owners can access their profile');
    const humanOwner = await this.humanOwnerRepository.findOne({
      where: { id: user.id, status: Status.Active },
      relations: ['profile_picture_document'],
    });
    if (!humanOwner) throw new NotFoundException('Human owner not found');
    return humanOwner;
  }

  async updateProfile(user: any, updateHumanOwnerDto: UpdateHumanOwnerDto, file?: Express.Multer.File) {
    if (user.entityType !== 'HumanOwner') throw new UnauthorizedException('Only human owners can update their profile');
    const humanOwner = await this.humanOwnerRepository.findOne({ where: { id: user.id, status: Status.Active } });
    if (!humanOwner) throw new NotFoundException('Human owner not found');

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
      humanOwner.profile_picture_document_id = document.id;
    }

    Object.assign(humanOwner, {
      human_owner_name: updateHumanOwnerDto.human_owner_name || humanOwner.human_owner_name,
      email: updateHumanOwnerDto.email || humanOwner.email,
      phone: updateHumanOwnerDto.phone || humanOwner.phone,
      location: updateHumanOwnerDto.location || humanOwner.location,
      latitude: updateHumanOwnerDto.latitude || humanOwner.latitude,
      longitude: updateHumanOwnerDto.longitude || humanOwner.longitude,
    });

    return this.humanOwnerRepository.save(humanOwner);
  }
}