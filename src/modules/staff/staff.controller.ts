import { Controller, Get, Patch, Body, UseGuards, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StaffService } from './staff.service';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';

@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('profile')
  async getProfile(@Req() req) {
    return this.staffService.getProfile(req.user);
  }

  @Patch('profile')
  @UseInterceptors(FileInterceptor('profile_picture'))
  async updateProfile(
    @Req() req,
    @Body() updateStaffDto: UpdateStaffDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.staffService.updateProfile(req.user, updateStaffDto, file);
  }
}