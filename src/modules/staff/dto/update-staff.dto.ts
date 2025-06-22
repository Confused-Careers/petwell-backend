import { IsOptional, IsString, IsEmail, IsEnum } from 'class-validator';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  staff_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(['Veterinarian', 'Nurse', 'Receptionist'])
  role_name?: 'Veterinarian' | 'Nurse' | 'Receptionist';
}