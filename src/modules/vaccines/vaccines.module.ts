import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VaccinesService } from './vaccines.service';
import { VaccinesController } from './vaccines.controller';
import { Vaccine } from './entities/vaccine.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Business } from '../businesses/entities/business.entity';
import { Team } from '../teams/entities/team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vaccine, PetProfile, Staff, Business, Team])],
  controllers: [VaccinesController],
  providers: [VaccinesService],
})
export class VaccinesModule {}