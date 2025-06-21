import { IsEmail, IsString, MinLength, IsUrl, IsOptional } from 'class-validator';

export class RegisterBusinessDto {
  @IsString()
  name: string;

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