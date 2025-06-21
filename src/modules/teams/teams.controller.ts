import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  async create(@Body() createTeamDto: CreateTeamDto, @Req() req) {
    return this.teamsService.create(createTeamDto, req.user);
  }

  @Get()
  async findAll(@Req() req) {
    return this.teamsService.findAll(req.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto, @Req() req) {
    return this.teamsService.update(id, updateTeamDto, req.user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.teamsService.remove(id, req.user);
  }

  @Get('search/businesses')
  async searchBusinesses(@Query('query') query: string, @Req() req) {
    return this.teamsService.searchBusinesses(query, req.user);
  }

  @Get('search/doctors')
  async searchDoctors(@Query('query') query: string, @Req() req) {
    return this.teamsService.searchDoctors(query, req.user);
  }
}