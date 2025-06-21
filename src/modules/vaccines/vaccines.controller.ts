import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VaccinesService } from './vaccines.service';
import { CreateVaccineDto } from './dto/create-vaccine.dto';
import { UpdateVaccineDto } from './dto/update-vaccine.dto';

@Controller('vaccines')
@UseGuards(JwtAuthGuard)
export class VaccinesController {
  constructor(private readonly vaccinesService: VaccinesService) {}

  @Post()
  async create(@Body() createVaccineDto: CreateVaccineDto, @Req() req) {
    return this.vaccinesService.create(createVaccineDto, req.user);
  }

  @Get()
  async findAll(@Query('petId') petId?: string) {
    return this.vaccinesService.findAll(petId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.vaccinesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateVaccineDto: UpdateVaccineDto, @Req() req) {
    return this.vaccinesService.update(id, updateVaccineDto, req.user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.vaccinesService.remove(id, req.user);
  }

  @Get('doctors')
  async findDoctors(@Query('petId') petId?: string, @Query('businessId') businessId?: string) {
    return this.vaccinesService.findDoctors(petId, businessId);
  }
}