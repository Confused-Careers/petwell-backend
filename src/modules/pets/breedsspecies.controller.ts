import { Controller, Get, UseGuards } from '@nestjs/common';
import { PetsService } from './pets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('pets/breeds-species')
@UseGuards(JwtAuthGuard)
export class BreedsSpeciesController {
  constructor(private readonly petsService: PetsService) {}

  @Get()
  getAllBreedsAndSpecies() {
    return this.petsService.getAllBreedsAndSpecies();
  }
}