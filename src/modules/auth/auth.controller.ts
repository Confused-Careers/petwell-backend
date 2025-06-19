import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterHumanOwnerDto } from './dto/register-human-owner.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, req.ip, req.headers['user-agent'] || 'unknown');
  }

  @Post('register/human-owner')
  async registerHumanOwner(@Body() dto: RegisterHumanOwnerDto) {
    return this.authService.registerHumanOwner(dto);
  }

  @Post('register/staff')
  async registerStaff(@Body() dto: RegisterStaffDto) {
    return this.authService.registerStaff(dto);
  }

  @Post('register/business')
  async registerBusiness(@Body() dto: RegisterBusinessDto) {
    return this.authService.registerBusiness(dto);
  }

  @Post('verify-otp')
  async verifyOtp(@Body('identifier') identifier: string, @Body('otp_code') otpCode: string) {
    return this.authService.verifyOtp(identifier, otpCode);
  }

  @Post('resend-otp')
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('identifier') identifier: string) {
    return this.authService.forgotPassword(identifier);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}