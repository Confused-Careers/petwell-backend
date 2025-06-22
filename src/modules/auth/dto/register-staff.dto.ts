import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class RegisterStaffDto {
  @IsString()
  username: string;

  @IsString()
  staff_name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  role: string;

  @IsUUID()
  business_id: string;
}