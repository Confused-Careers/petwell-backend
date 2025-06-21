import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateVaccineDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  date_administered?: string;

  @IsOptional()
  @IsDateString()
  date_due?: string;

  @IsOptional()
  @IsString()
  staff_id?: string;

  @IsOptional()
  @IsString()
  pet_id?: string;
}