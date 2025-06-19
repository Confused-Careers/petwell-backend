import { IsEmail, IsString, IsEnum, MinLength } from 'class-validator';

export class RegisterHumanOwnerDto {
  @IsString()
  username: string;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

}