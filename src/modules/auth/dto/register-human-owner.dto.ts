import { IsString, IsEmail, MinLength } from 'class-validator';

export class RegisterHumanOwnerDto {
  @IsString()
  username: string;

  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}