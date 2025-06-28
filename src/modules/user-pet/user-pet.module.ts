import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPetController } from './user-pet.controller';
import { UserPetService } from './user-pet.service';
import { PetProfile } from '../pets/entities/pet-profile.entity';
import { BreedSpecies } from '../pets/entities/breed-species.entity';
import { Breed } from '../pets/entities/breed.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { Document } from '../documents/entities/document.entity';
import { Vaccine } from '../vaccines/entities/vaccine.entity';
import { DocumentsModule } from '../documents/documents.module';
import { VaccinesService } from '../vaccines/vaccines.service';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';

@Module({
  imports: [
    TypeOrmModule.forFeature([PetProfile, BreedSpecies, Breed, HumanOwner, AuditLog, Document, Vaccine]),
    DocumentsModule,
  ],
  controllers: [UserPetController],
  providers: [UserPetService, VaccinesService, UuidValidationPipe],
})
export class UserPetModule {}