import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetsService } from './pets.service';
import { PetsController } from './pets.controller';
import { BreedsSpeciesController } from './breedsspecies.controller';
import { PetProfile } from './entities/pet-profile.entity';
import { BreedSpecies } from './entities/breed-species.entity';
import { Breed } from './entities/breed.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { Document } from '../documents/entities/document.entity';
import { DocumentsModule } from '../documents/documents.module';
import { VaccinesService } from '../vaccines/vaccines.service';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { Vaccine } from '../vaccines/entities/vaccine.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PetProfile, BreedSpecies, Breed, HumanOwner, AuditLog, Document, Vaccine]),
    DocumentsModule,
  ],
  controllers: [BreedsSpeciesController, PetsController],
  providers: [PetsService, VaccinesService, UuidValidationPipe], 
})
export class PetsModule {}