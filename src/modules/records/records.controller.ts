import { Controller, Post, Body, Get, Query, UseGuards, Request } from '@nestjs/common';
import { RecordsService } from './records.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { FilterRecordsDto } from './dto/filter-records.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  createRecord(@Request() req, @Body() createRecordDto: CreateRecordDto) {
    return this.recordsService.createRecord(req.user, createRecordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getAll')
  getAllRecords(@Request() req, @Query() filterRecordsDto: FilterRecordsDto) {
    return this.recordsService.getAllRecords(req.user, filterRecordsDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('vets')
  getVets(@Request() req, @Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.recordsService.getVets(req.user, parseInt(page, 10), parseInt(limit, 10));
  }

  @UseGuards(JwtAuthGuard)
  @Get('recent')
  getRecentRecords(@Request() req, @Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.recordsService.getRecentRecords(req.user, parseInt(page, 10), parseInt(limit, 10));
  }
}