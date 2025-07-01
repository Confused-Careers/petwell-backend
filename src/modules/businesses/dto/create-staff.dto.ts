import { IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  staff_name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(['Vet', 'Assistant', 'Manager', 'Receptionist'])
  @IsNotEmpty()
  role_name?: string;

  @IsEnum(['Full', 'Editor', 'View', 'Staff'])
  @IsNotEmpty()
  access_level?: string;
}