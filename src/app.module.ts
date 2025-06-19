import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { PetsModule } from './modules/pets/pets.module';
import { VaccinesModule } from './modules/vaccines/vaccines.module';
import { StaffModule } from './modules/staff/staff.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { HumanOwnersModule } from './modules/human_owners/human_owners.module';
import { TeamsModule } from './modules/teams/teams.module';

@Module({
  imports: [
    UsersModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
