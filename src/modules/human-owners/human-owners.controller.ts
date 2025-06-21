import { Controller, Get, Patch, Body, UseGuards, UseInterceptors, UploadedFile, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HumanOwnersService } from './human-owners.service';
import { UpdateHumanOwnerDto } from './dto/update-human-owner.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';

@Controller('human-owners')
@UseGuards(JwtAuthGuard)
export class HumanOwnersController {
  constructor(private readonly humanOwnersService: HumanOwnersService) {}

  @Get('profile')
  async getProfile(@Req() req) {
    return this.humanOwnersService.getProfile(req.user);
  }

  @Patch('profile')
  @UseInterceptors(FileInterceptor('profile_picture'))
  async updateProfile(
    @Req() req,
    @Body() updateHumanOwnerDto: UpdateHumanOwnerDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.humanOwnersService.updateProfile(req.user, updateHumanOwnerDto, file);
  }
}