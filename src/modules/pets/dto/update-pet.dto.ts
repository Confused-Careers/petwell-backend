import { IsOptional, IsString, IsInt, IsBoolean, IsDateString, IsNumber, Min, Max, IsUUID, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { Status } from '@shared/enums/status.enum';

export class UpdatePetDto {
  @IsOptional()
  @IsString()
  pet_name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseInt(value, 10) : value))
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseInt(value, 10) : value))
  @IsInt()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsUUID()
  breed_species_id?: string;

  @IsOptional()
  @IsUUID()
  breed_id?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  spay_neuter?: boolean;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  microchip?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  qr_code_id?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}