import { IsOptional, IsString, IsEmail, IsEnum } from 'class-validator';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  staff_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsEnum([
    'Veterinarian',
    'Nurse',
    'Receptionist',
    'Groomer',
    'Trainer',
    'Nutritionist',
    'Therapist',
    'Behaviorist',
    'Pet Sitter',
    'Store Manager',
  ])
  role_name?: string;
}