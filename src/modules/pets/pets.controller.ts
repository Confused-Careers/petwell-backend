import { Controller, Post, Body, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Request } from 'express';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { PetBreedSpeciesDto } from './dto/get-species-breed.dto';

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  create(@Body() createPetDto: CreatePetDto, @Req() req: Request) {
    return this.petsService.create(createPetDto, req.user, req.ip, req.get('user-agent'));
  }

  @Get('owner')
  findAllByOwner(@Req() req: Request) {
    return this.petsService.findAllByOwner(req.user);
  }

  @Get(':id')
  findOne(@Param('id', UuidValidationPipe) id: string, @Req() req: Request) {
    return this.petsService.findOne(id, req.user);
  }

  @Put(':id')
  update(@Param('id', UuidValidationPipe) id: string, @Body() updatePetDto: UpdatePetDto, @Req() req: Request) {
    return this.petsService.update(id, updatePetDto, req.user, req.ip, req.get('user-agent'));
  }

  @Post('species')
  @UseGuards(JwtAuthGuard)
  getSpecies(@Body() petBreedSpeciesDto:PetBreedSpeciesDto) {
    return this.petsService.getSpecies(petBreedSpeciesDto);
  }

  @Post('breeds')
  @UseGuards(JwtAuthGuard)
  getBreeds(@Body() petBreedSpeciesDto:PetBreedSpeciesDto) {
    return this.petsService.getBreeds(petBreedSpeciesDto);
  }
}