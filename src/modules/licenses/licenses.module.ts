import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';
import { License } from './entities/license.entity';
import { HumanOwner } from '@modules/human-owners/entities/human-owner.entity';
import { Business } from '@modules/businesses/entities/business.entity';
import { AuditLog } from '@modules/audit-logs/entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([License, HumanOwner, Business, AuditLog])],
  controllers: [LicensesController],
  providers: [LicensesService],
  exports: [LicensesService],
})
export class LicensesModule {}