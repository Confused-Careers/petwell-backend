import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateVaccineDto {
  @IsOptional()
  @IsString()
  vaccine_name?: string;

  @IsOptional()
  @IsDateString()
  date_administered?: string;

  @IsOptional()
  @IsDateString()
  date_due?: string;

  @IsOptional()
  @IsString()
  administered_by?: string;

  @IsOptional()
  @IsString()
  pet_id?: string;

  @IsOptional()
  @IsString()
  vaccine_document_id?: string;
}