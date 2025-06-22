import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { config } from 'dotenv';
config();


@Injectable()
export class NodeMailerService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST as string,
      port: parseInt(process.env.EMAIL_PORT as string, 10),
      secure: false, // Use TLS
      auth: {
        user: process.env.EMAIL_USER as string,
        pass: process.env.EMAIL_PASS as string,
      },
    });
  }

  async sendOtpEmail(to: string, otp: string) {
    await this.transporter.sendMail({
      from: `"PetWell" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Your PetWell OTP Code',
      text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your OTP code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    });
  }

  async shareStaffCredentials(to: string, username: string, password: string) {
    await this.transporter.sendMail({
      from: `"PetWell" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Your PetWell Staff Credentials',
      text: `Your PetWell staff credentials are as follows:\nUsername: ${username}\nPassword: ${password}`,
      html: `<p>Your PetWell staff credentials are as follows:</p><p>Username: <strong>${username}</strong></p><p>Password: <strong>${password}</strong></p>`,
    });
  }
}