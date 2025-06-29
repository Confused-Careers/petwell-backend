import { IsEmail, IsString, MinLength, IsUrl, IsOptional } from 'class-validator';

export class RegisterBusinessDto {
  @IsString()
  business_name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  description: string;

  @IsUrl()
  @IsOptional()
  website: string;

  @IsOptional()
  @IsString()
  address: string;

  @IsUrl()
  @IsOptional()
  instagram: string;

  @IsUrl()
  @IsOptional()
  facebook: string;

  @IsUrl()
  @IsOptional()
  x: string;
}