import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { DocumentProcessor } from './document.processor';
import { UserPetService } from '../user-pet/user-pet.service';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { BreedSpecies } from '../pets/entities/breed-species.entity';
import { Breed } from '../pets/entities/breed.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { Document } from '../documents/entities/document.entity';
import { Vaccine } from '../vaccines/entities/vaccine.entity';
import { DocumentsModule } from '../documents/documents.module';
import { VaccinesService } from '../vaccines/vaccines.service';
import { redisConfig } from '../../config/redis.config';
import { BusinessPetMapping } from '@modules/businesses/entities/business-pet-mapping.entity';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'document-processing',
    }),
    TypeOrmModule.forFeature([PetProfile, BreedSpecies, Breed, HumanOwner, AuditLog, Document, Vaccine, BusinessPetMapping]),
    DocumentsModule,
    RedisModule.forRootAsync(redisConfig),
  ],
  providers: [DocumentProcessor, UserPetService, VaccinesService],
})
export class DocumentProcessingModule {}