import { Controller, Get, Patch, Post, Delete, Body, UseGuards, UseInterceptors, UploadedFile, Req, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessesService } from './businesses.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from '../staff/dto/update-staff.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';

@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get('profile')
  async getProfile(@Req() req) {
    return this.businessesService.getProfile(req.user);
  }

  @Patch('profile')
  @UseInterceptors(FileInterceptor('profile_picture'))
  async updateProfile(
    @Req() req,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.businessesService.updateProfile(req.user, updateBusinessDto, file);
  }

  @Post('staff')
  async addStaff(@Req() req, @Body() createStaffDto: CreateStaffDto) {
    return this.businessesService.addStaff(req.user, createStaffDto);
  }

  @Patch('staff/:staffId')
  async updateStaff(@Req() req, @Param('staffId') staffId: string, @Body() updateStaffDto: UpdateStaffDto) {
    return this.businessesService.updateStaff(req.user, staffId, updateStaffDto);
  }

  @Delete('staff/:staffId')
  async removeStaff(@Req() req, @Param('staffId') staffId: string) {
    return this.businessesService.removeStaff(req.user, staffId);
  }

  @Get('staff')
  async getStaffList(@Req() req) {
    return this.businessesService.getStaffList(req.user);
  }
}