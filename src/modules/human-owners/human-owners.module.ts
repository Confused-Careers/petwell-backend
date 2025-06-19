import { Module } from '@nestjs/common';
import { HumanOwnersController } from './human-owners.controller';
import { HumanOwnersService } from './human-owners.service';

@Module({
  controllers: [HumanOwnersController],
  providers: [HumanOwnersService]
})
export class HumanOwnersModule {}
