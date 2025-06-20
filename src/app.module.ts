import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}