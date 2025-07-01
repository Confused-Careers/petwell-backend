import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  staff_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(['Vet', 'Assistant', 'Manager', 'Receptionist', 'Staff'])
  role_name?: string;

  @IsOptional()
  @IsEnum(['Full', 'Editor', 'View', 'Staff'])
  access_level?: string;
}