import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserPetService } from './user-pet.service';
import { Express } from 'express';

@Controller('user-pets')
@UseGuards(JwtAuthGuard)
export class UserPetController {
  constructor(private readonly userPetService: UserPetService) {}

  @Post('create-from-documents')
  @UseInterceptors(FilesInterceptor('files', 10)) // Limit to 10 files
  async createPetFromDocuments(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one document is required to create a pet');
    }
    return this.userPetService.createPetFromDocuments(files, req.user, req.ip, req.get('user-agent'));
  }
}