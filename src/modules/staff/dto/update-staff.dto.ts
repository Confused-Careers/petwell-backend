import { IsOptional, IsString, IsEmail, IsEnum } from 'class-validator';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(['Veterinarian', 'Nurse', 'Receptionist'])
  role?: 'Veterinarian' | 'Nurse' | 'Receptionist';
}