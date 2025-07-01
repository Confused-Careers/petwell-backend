import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from '@nestjs-modules/ioredis';
import { UserPetController } from './user-pet.controller';
import { UserPetService } from './user-pet.service';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { BreedSpecies } from '../pets/entities/breed-species.entity';
import { Breed } from '../pets/entities/breed.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { Document } from '../documents/entities/document.entity';
import { Vaccine } from '../vaccines/entities/vaccine.entity';
import { DocumentsModule } from '../documents/documents.module';
import { VaccinesService } from '../vaccines/vaccines.service';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { DocumentProcessingModule } from '../document-processing/document-processing.module';
import { redisConfig } from '../../config/redis.config';
import { BusinessPetMapping } from '@modules/businesses/entities/business-pet-mapping.entity';
import { NotificationModule } from '@modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PetProfile, BreedSpecies, Breed, HumanOwner, AuditLog, Document, Vaccine, BusinessPetMapping]),
    DocumentsModule, 
    BullModule.registerQueue({
      name: 'document-processing',
    }),
    RedisModule.forRootAsync(redisConfig),
    DocumentProcessingModule,
    NotificationModule,
  ],
  controllers: [UserPetController],
  providers: [UserPetService, VaccinesService, UuidValidationPipe],
  exports: [UserPetService],
})
export class UserPetModule {}