import { IsNotEmpty, IsString, IsEmail, IsEnum } from 'class-validator';

export class CreateStaffDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  staff_name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsEnum(['Veterinarian', 'Nurse', 'Receptionist'])
  role_name: 'Veterinarian' | 'Nurse' | 'Receptionist';
}