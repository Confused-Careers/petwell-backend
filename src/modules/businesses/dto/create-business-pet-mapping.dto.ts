import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBusinessPetMappingDto {
  @IsString()
  @IsNotEmpty()
  pet_id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  note?: string;
}