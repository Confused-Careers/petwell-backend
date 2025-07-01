import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '@modules/auth/auth.module';
import { BusinessesModule } from '@modules/businesses/businesses.module';
import { PetsModule } from '@modules/pets/pets.module';
import { VaccinesModule } from '@modules/vaccines/vaccines.module';
import { StaffModule } from '@modules/staff/staff.module';
import { DocumentsModule } from '@modules/documents/documents.module';
import { TimelineModule } from '@modules/timeline/timeline.module';
import { MessagesModule } from '@modules/messages/messages.module';
import { ReviewsModule } from '@modules/reviews/reviews.module';
import { HumanOwnersModule } from '@modules/human-owners/human-owners.module';
import { TeamsModule } from '@modules/teams/teams.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { dataSourceOptions } from '@config/database.config';
import { LicensesModule } from './modules/licenses/licenses.module';
import { UserPetModule } from './modules/user-pet/user-pet.module';
import { DocumentProcessingModule } from './modules/document-processing/document-processing.module';
import { redisConfig } from './config/redis.config';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync(redisConfig),
    AuthModule,
    BusinessesModule,
    PetsModule,
    VaccinesModule,
    StaffModule,
    DocumentsModule,
    TimelineModule,
    MessagesModule,
    ReviewsModule,
    HumanOwnersModule,
    TeamsModule,
    AuditLogsModule,
    LicensesModule,
    UserPetModule,
    DocumentProcessingModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}