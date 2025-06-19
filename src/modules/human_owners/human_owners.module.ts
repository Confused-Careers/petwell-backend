import { Module } from '@nestjs/common';
import { HumanOwnersController } from './human_owners.controller';
import { HumanOwnersService } from './human_owners.service';

@Module({
  controllers: [HumanOwnersController],
  providers: [HumanOwnersService]
})
export class HumanOwnersModule {}
