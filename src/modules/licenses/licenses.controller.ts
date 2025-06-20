import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { CreateLicenseDto } from './dto/create-license.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('licenses')
@UseGuards(JwtAuthGuard)
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Post()
  create(@Body() createLicenseDto: CreateLicenseDto, @Req() req: Request) {
    return this.licensesService.create(createLicenseDto, req.user, req.ip, req.headers['user-agent'] || 'unknown');
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.licensesService.findAllByEntity(req.user);
  }
}