import { IsOptional, IsString, IsEmail, IsObject } from 'class-validator';

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  business_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsObject()
  socials?: any;

  @IsOptional()
  @IsString()
  description?: string;
}