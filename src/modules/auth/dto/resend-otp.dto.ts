import { IsString, IsOptional } from 'class-validator';

export class ResendOtpDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  otp_type: 'Registration' | 'PasswordReset';
}