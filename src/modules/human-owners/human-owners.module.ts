import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HumanOwnersService } from './human-owners.service';
import { HumanOwnersController } from './human-owners.controller';
import { HumanOwner } from './entities/human-owner.entity';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [TypeOrmModule.forFeature([HumanOwner, PetProfile]), DocumentsModule],
  controllers: [HumanOwnersController],
  providers: [HumanOwnersService],
  exports: [HumanOwnersService],
})
export class HumanOwnersModule {}