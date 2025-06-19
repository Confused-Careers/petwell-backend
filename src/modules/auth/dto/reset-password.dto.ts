import { IsString, MinLength, IsOptional } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  otp_code: string;

  @IsString()
  @MinLength(6)
  new_password: string;
}