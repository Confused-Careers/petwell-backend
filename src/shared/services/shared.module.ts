import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AwsConfigService } from '../../config/aws.config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [AwsConfigService],
  exports: [AwsConfigService],
})
export class SharedModule {}