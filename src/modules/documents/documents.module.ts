import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { HumanOwner } from '../human-owners/entities/human-owner.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Business } from '../businesses/entities/business.entity';
import { AwsService } from '../../aws/aws.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, HumanOwner, Staff, Business]),
  ],
  providers: [DocumentsService, AwsService],
  exports: [DocumentsService, TypeOrmModule],
})
export class DocumentsModule {}