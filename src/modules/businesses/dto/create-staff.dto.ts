import { IsNotEmpty, IsString, IsEmail, IsEnum } from 'class-validator';

export class CreateStaffDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsEnum(['Veterinarian', 'Nurse', 'Receptionist'])
  role: 'Veterinarian' | 'Nurse' | 'Receptionist';
}