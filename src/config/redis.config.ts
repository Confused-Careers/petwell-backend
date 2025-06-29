import { ConfigService } from '@nestjs/config';
import { RedisModuleOptions } from '@nestjs-modules/ioredis';

export const redisConfig = {
  provide: 'REDIS_CONFIG',
  useFactory: (configService: ConfigService): RedisModuleOptions => ({
    type: 'single',
    url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
  }),
  inject: [ConfigService],
};