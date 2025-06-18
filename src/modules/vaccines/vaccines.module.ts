import { Module } from '@nestjs/common';
import { VaccinesService } from './vaccines.service';
import { VaccinesController } from './vaccines.controller';

@Module({
  providers: [VaccinesService],
  controllers: [VaccinesController]
})
export class VaccinesModule {}
