import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VaccinesService } from './vaccines.service';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { UpdateVaccineDto } from './dto/update-vaccine.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Express } from 'express';

@Controller('vaccines')
@UseGuards(JwtAuthGuard)
export class VaccinesController {
  constructor(private readonly vaccinesService: VaccinesService) {}

  @Post('create')
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createVaccineDto: CreateVaccineDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    return this.vaccinesService.create(createVaccineDto, req.user, file, req.ip, req.get('user-agent'));
  }

  @Post('getVaccinesDetails')
  @UseInterceptors(FileInterceptor('file'))
  async parseDocument(
    @Body('petId') petId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return this.vaccinesService.parseVaccineDocument(petId, file, req.user, req.ip, req.get('user-agent'));
  }

  @Get('getAllPetVaccines/:id')
  async findAll(@Param('petId') petId?: string) {
    return this.vaccinesService.findAll(petId);
  }

  @Get('getPetVaccine/:id')
  async findOne(@Param('id') id: string) {
    return this.vaccinesService.findOne(id);
  }

  @Patch('update/:id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() updateVaccineDto: UpdateVaccineDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    return this.vaccinesService.update(id, updateVaccineDto, req.user, file, req.ip, req.get('user-agent'));
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    return this.vaccinesService.remove(id, req.user);
  }

  @Get('doctors')
  async findDoctors(@Query('petId') petId?: string, @Query('businessId') businessId?: string) {
    return this.vaccinesService.findDoctors(petId, businessId);
  }
}