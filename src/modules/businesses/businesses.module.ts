import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { Business } from './entities/business.entity';
import { Staff } from '../staff/entities/staff.entity';
import { DocumentsModule } from '../documents/documents.module';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { BusinessPetMapping } from './entities/business-pet-mapping.entity';
import { NodeMailerService } from '@shared/services/nodemailer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Business, Staff, PetProfile, BusinessPetMapping]), DocumentsModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, NodeMailerService],
  exports: [BusinessesService],
})
export class BusinessesModule {}