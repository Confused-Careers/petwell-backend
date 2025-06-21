import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class CreateVaccineDto {
  @IsNotEmpty()
  @IsString()
  name: string;

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
}