import { Controller, Get, Post, Patch, Param, Body, UseGuards, UseInterceptors, UploadedFiles, Req, Delete, UploadedFile } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { PetBreedSpeciesDto } from './dto/get-species-breed.dto';

@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async create(@Body() createPetDto: CreatePetDto, @Req() req) {
    return this.petsService.create(createPetDto, req.user, req.ip, req.get('user-agent'));
  }

  @UseGuards(JwtAuthGuard)
  @Get('owner')
  async findAllByOwner(@Req() req) {
    return this.petsService.findAllByOwner(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get/:id')
  async findOne(@Param('id') id: string, @Req() req) {
    return this.petsService.findOne(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update/:id')
  @UseInterceptors(FileInterceptor('profile_picture'))
  async update(
    @Param('id') id: string,
    @Body() updatePetDto: UpdatePetDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.petsService.update(id, updatePetDto, req.user, req.ip, req.get('user-agent'), file);
  }

  @Get('breeds-species')
  async getAllBreedsAndSpecies() {
    return this.petsService.getAllBreedsAndSpecies();
  }

  @Post('species')
  async getSpecies(@Body() petBreedSpeciesDto: PetBreedSpeciesDto) {
    return this.petsService.getSpecies(petBreedSpeciesDto);
  }

  @Post('breeds')
  async getBreeds(@Body() petBreedSpeciesDto: PetBreedSpeciesDto) {
    return this.petsService.getBreeds(petBreedSpeciesDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('documents/:petId')
  async getPetDocuments(@Param('petId') petId: string, @Req() req) {
    return this.petsService.getPetDocuments(petId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('documents/:petId')
  @UseInterceptors(FileInterceptor('file'))
  async addPetDocument(
    @Param('petId') petId: string,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.petsService.addPetDocument(petId, uploadDocumentDto, file, req.user, req.ip, req.get('user-agent'));
  }

  @UseGuards(JwtAuthGuard)
  @Post('documents/multiple/:petId')
  @UseInterceptors(FilesInterceptor('files', 10))
  async addMultiplePetDocuments(
    @Param('petId') petId: string,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ) {
    return this.petsService.addMultiplePetDocuments(petId, uploadDocumentDto, files, req.user, req.ip, req.get('user-agent'));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('documents/:id')
  @UseInterceptors(FileInterceptor('file'))
  async updatePetDocument(
    @Param('id') id: string,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.petsService.updatePetDocument(id, uploadDocumentDto, file, req.user, req.ip, req.get('user-agent'));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('documents/name/:id')
  async updatePetDocumentName(
    @Param('id') id: string,
    @Body('document_name') documentName: string,
    @Req() req,
  ) {
    return this.petsService.updatePetDocumentName(id, documentName, req.user, req.ip, req.get('user-agent'));
  }

  @UseGuards(JwtAuthGuard)
  @Delete('documents/:id')
  async deletePetDocument(@Param('id') id: string, @Req() req) {
    return this.petsService.deletePetDocument(id, req.user, req.ip, req.get('user-agent'));
  }
}