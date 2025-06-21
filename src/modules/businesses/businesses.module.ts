import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesService } from './businesses.service';
import { BusinessesController } from './businesses.controller';
import { Business } from './entities/business.entity';
import { Staff } from '../staff/entities/staff.entity';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [TypeOrmModule.forFeature([Business, Staff]), DocumentsModule],
  controllers: [BusinessesController],
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}