import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { HumanOwner } from '@modules/human-owners/entities/human-owner.entity';
import { Staff } from '@modules/staff/entities/staff.entity';
import { Business } from '@modules/businesses/entities/business.entity';
import { AuditLog } from '@modules/audit-logs/entities/audit-log.entity';
import { PetProfile } from '@modules/pets/entities/pet-profile.entity';
import { BreedSpecies } from '@modules/pets/entities/breed-species.entity';
import { Breed } from '@modules/pets/entities/breed.entity';
import { jwtConfig } from '@config/jwt.config';
import { NodeMailerService } from '@shared/services/nodemailer.service';
import { DocumentsService } from '@modules/documents/documents.service';
import { AwsService } from '../../aws/aws.service';
import { Document } from '@modules/documents/entities/document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([HumanOwner, Staff, Business, AuditLog, PetProfile, BreedSpecies, Breed, Document]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      privateKey: jwtConfig.privateKey,
      publicKey: jwtConfig.publicKey,
      signOptions: {
        ...jwtConfig.signOptions,
        algorithm: jwtConfig.signOptions.algorithm as import('jsonwebtoken').Algorithm,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, NodeMailerService, DocumentsService, AwsService],
  exports: [AuthService],
})
export class AuthModule {}