import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { Record } from './entities/record.entity';
import { BusinessPetMapping } from '../businesses/entities/business-pet-mapping.entity';
import { Business } from '../businesses/entities/business.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { Staff } from '../staff/entities/staff.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Record, BusinessPetMapping, Business, PetProfile, Staff]),
  ],
  controllers: [RecordsController],
  providers: [RecordsService],
})
export class RecordsModule {}