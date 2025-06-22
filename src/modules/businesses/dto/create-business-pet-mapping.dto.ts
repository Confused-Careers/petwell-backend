import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateBusinessPetMappingDto {
  @IsNotEmpty()
  @IsUUID()
  pet_id: string;

  @IsOptional()
  @IsUUID()
  staff_id?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  note?: string;
}