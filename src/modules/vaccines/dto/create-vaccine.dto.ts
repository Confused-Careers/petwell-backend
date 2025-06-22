import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateVaccineDto {
  @IsNotEmpty()
  @IsString()
  vaccine_name: string;

  @IsNotEmpty()
  @IsDateString()
  date_administered: string;

  @IsNotEmpty()
  @IsDateString()
  date_due: string;

  @IsNotEmpty()
  @IsString()
  staff_id: string;

  @IsNotEmpty()
  @IsString()
  pet_id: string;

  @IsOptional()
  @IsString()
  vaccine_document_id?: string;
}