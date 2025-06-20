import { IsOptional, IsString, IsInt, IsBoolean, IsDateString, IsNumber, Min, Max, IsUUID, IsEnum } from 'class-validator';
import { Status } from '@shared/enums/status.enum';

export class UpdatePetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
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
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
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
  profile_picture_document_id?: string;

  @IsOptional()
  @IsString()
  qr_code_id?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}