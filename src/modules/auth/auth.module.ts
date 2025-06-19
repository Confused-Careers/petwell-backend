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
import { jwtConfig } from '@config/jwt.config';
import { NodeMailerService } from '@shared/services/nodemailer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([HumanOwner, Staff, Business, AuditLog]),
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
  providers: [AuthService, JwtStrategy, NodeMailerService],
  exports: [AuthService],
})
export class AuthModule {}