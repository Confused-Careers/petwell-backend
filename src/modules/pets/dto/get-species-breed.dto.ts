import { IsOptional, IsString, IsInt, IsBoolean, IsDateString, IsNumber, Min, Max, IsUUID, IsEnum } from 'class-validator';
import { Status } from '@shared/enums/status.enum';

export class PetBreedSpeciesDto {
  @IsOptional()
  @IsString()
  search_txt?: string;

  @IsOptional()
  @IsUUID()
  breed_species_id?: string;

   @IsOptional()
  @IsInt()
  skip?: number;

  @IsOptional()
  @IsInt()
  limit?: number;

}