import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { Team } from './entities/team.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { Business } from '../businesses/entities/business.entity';
import { Staff } from '../staff/entities/staff.entity';
import { BusinessPetMapping } from '@modules/businesses/entities/business-pet-mapping.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Team, HumanOwner, PetProfile, Business, Staff, BusinessPetMapping])],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}