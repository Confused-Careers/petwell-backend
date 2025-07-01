import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaccinesService } from './vaccines.service';
import { VaccinesController } from './vaccines.controller';
import { Vaccine } from './entities/vaccine.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Business } from '../businesses/entities/business.entity';
import { Team } from '../teams/entities/team.entity';
import { Document } from '../documents/entities/document.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { DocumentsModule } from '../documents/documents.module';
import { BusinessPetMapping } from '@modules/businesses/entities/business-pet-mapping.entity';
import { Notification } from '@modules/notification/entities/notification.entity';
import { NotificationModule } from '@modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vaccine, PetProfile, Staff, Business, Team, Document, AuditLog, BusinessPetMapping, Notification]),
    DocumentsModule,
    NotificationModule,
  ],
  controllers: [VaccinesController],
  providers: [VaccinesService],
  exports: [VaccinesService],
})
export class VaccinesModule {}