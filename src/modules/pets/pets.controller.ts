import { Controller, Post, Body, Get, Param, Put, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { UploadDocumentDto } from '@modules/documents/dto/upload-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Request } from 'express';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { PetBreedSpeciesDto } from './dto/get-species-breed.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post('create')
  create(@Body() createPetDto: CreatePetDto, @Req() req: Request) {
    return this.petsService.create(createPetDto, req.user, req.ip, req.get('user-agent'));
  }

  @Get('owner')
  findAllByOwner(@Req() req: Request) {
    return this.petsService.findAllByOwner(req.user);
  }

  @Get('get/:id')
  findOne(@Param('id', UuidValidationPipe) id: string, @Req() req: Request) {
    return this.petsService.findOne(id, req.user);
  }

  @Put('update/:id')
  update(@Param('id', UuidValidationPipe) id: string, @Body() updatePetDto: UpdatePetDto, @Req() req: Request) {
    return this.petsService.update(id, updatePetDto, req.user, req.ip, req.get('user-agent'));
  }

  @Post('species')
  getSpecies(@Body() petBreedSpeciesDto: PetBreedSpeciesDto) {
    return this.petsService.getSpecies(petBreedSpeciesDto);
  }

  @Post('breeds')
  getBreeds(@Body() petBreedSpeciesDto: PetBreedSpeciesDto) {
    return this.petsService.getBreeds(petBreedSpeciesDto);
  }

  @Get('documents/:id')
  getPetDocuments(@Param('id', UuidValidationPipe) id: string, @Req() req: Request) {
    return this.petsService.getPetDocuments(id, req.user);
  }

  @Post('documents/:id')
  @UseInterceptors(FileInterceptor('file'))
  addPetDocument(
    @Param('id', UuidValidationPipe) id: string,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return this.petsService.addPetDocument(id, uploadDocumentDto, file, req.user, req.ip, req.get('user-agent'));
  }

  @Put('documents/:id')
  @UseInterceptors(FileInterceptor('file'))
  updatePetDocument(
    @Param('id', UuidValidationPipe) id: string,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return this.petsService.updatePetDocument(id, uploadDocumentDto, file, req.user, req.ip, req.get('user-agent'));
  }
  
}