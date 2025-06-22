import { IsString, IsEmail, MinLength } from 'class-validator';

export class RegisterHumanOwnerDto {
  @IsString()
  username: string;

  @IsString()
  human_owner_name: string;

  @IsEmail()
  email: string;

  @IsString()
  location: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}