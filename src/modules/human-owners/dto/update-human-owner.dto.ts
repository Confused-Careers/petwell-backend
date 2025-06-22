import { IsOptional, IsString, IsEmail, IsNumber } from 'class-validator';

export class UpdateHumanOwnerDto {
  @IsOptional()
  @IsString()
  human_owner_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}