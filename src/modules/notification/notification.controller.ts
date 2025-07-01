import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Patch } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';;
import { Notification } from './entities/notification.entity';
import { JwtAuthGuard } from 'common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('create')
  create(@Body() createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.notificationService.create(createNotificationDto);
  }

  @Get('getAll')
  findAll(@Request() req, @Body() filter: NotificationFilterDto): Promise<Notification[]> {
    return this.notificationService.findAllByOwner(req.user, filter);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req): Promise<Notification> {
    return this.notificationService.markAsRead(id, req.user);
  }

  @Post('mark-all-read')
  markAllAsRead(@Request() req, @Body('petId') petId?: string): Promise<{ message: string }> {
    return this.notificationService.markAllAsRead(req.user, petId);
  }

  @Delete(':id')
  dismiss(@Param('id') id: string, @Request() req): Promise<{ message: string }> {
    return this.notificationService.dismiss(id, req.user);
  }

  @Post('dismiss-all')
  dismissAll(@Request() req, @Body('petId') petId?: string): Promise<{ message: string }> {
    return this.notificationService.dismissAll(req.user, petId);
  }
}