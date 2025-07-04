import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { Vaccine } from '../vaccines/entities/vaccine.entity';
import { Document } from '../documents/entities/document.entity';
import { PetsService } from '../pets/pets.service';
import { VaccinesService } from '../vaccines/vaccines.service';
import { DocumentsService } from '../documents/documents.service';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { BreedSpecies } from '../pets/entities/breed-species.entity';
import { Breed } from '../pets/entities/breed.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { BusinessPetMapping } from '../businesses/entities/business-pet-mapping.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Business } from '../businesses/entities/business.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { Record } from '../records/entities/record.entity';
import { AwsModule } from 'aws/aws.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      PetProfile,
      Vaccine,
      Document,
      HumanOwner,
      BreedSpecies,
      Breed,
      AuditLog,
      BusinessPetMapping,
      Staff,
      Business,
      Record,
    ]),
    ScheduleModule.forRoot(),
    AwsModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    PetsService,
    VaccinesService,
    DocumentsService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
