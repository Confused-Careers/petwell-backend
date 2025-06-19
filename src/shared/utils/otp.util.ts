export class OtpUtil {
  static generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  }

  static isOtpExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }
}