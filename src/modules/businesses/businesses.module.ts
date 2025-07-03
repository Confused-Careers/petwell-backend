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
import { Team } from '../teams/entities/team.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { Record } from '../records/entities/record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Business, Staff, PetProfile, BusinessPetMapping, Team, HumanOwner, Record]), DocumentsModule],
  controllers: [BusinessesController],
  providers: [BusinessesService, NodeMailerService],
  exports: [BusinessesService],
})
export class BusinessesModule {}