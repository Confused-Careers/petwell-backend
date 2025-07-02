import { IsNotEmpty, IsString, IsEmail, IsNumber, IsOptional, IsBoolean, IsDateString, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class RegisterHumanOwnerWithPetDto {
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  human_owner_name: string;

  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  location: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  username: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  pet_name: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    return value;
  })
  pet_age: number;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  pet_species_id: string;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  pet_breed_id: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    return value;
  })
  pet_weight?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      return lowerValue === 'true' || lowerValue === '1' ? true : lowerValue === 'false' || lowerValue === '0' ? false : undefined;
    }
    return value;
  })
  pet_spay_neuter?: boolean;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value && typeof value === 'string' ? value.trim() : value))
  pet_color?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value && typeof value === 'string' ? value.trim() : value))
  pet_dob?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value && typeof value === 'string' ? value.trim() : value))
  pet_microchip?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value && typeof value === 'string' ? value.trim() : value))
  pet_notes?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  document_name: string;

  @IsOptional()
  @IsEnum(['PDF', 'JPG', 'PNG', 'JPEG'])
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  file_type: 'PDF' | 'JPG' | 'PNG' | 'JPEG';
}