import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { HumanOwner } from '@modules/human-owners/entities/human-owner.entity';
import { Staff } from '@modules/staff/entities/staff.entity';
import { Business } from '@modules/businesses/entities/business.entity';
import { AuditLog } from '@modules/audit-logs/entities/audit-log.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterHumanOwnerDto } from './dto/register-human-owner.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { OtpUtil } from '@shared/utils/otp.util';
import { NodeMailerService } from '@shared/services/nodemailer.service';
import { jwtConfig } from '@config/jwt.config';
import { Status } from '@shared/enums/status.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(HumanOwner)
    private humanOwnerRepository: Repository<HumanOwner>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private jwtService: JwtService,
    private nodeMailerService: NodeMailerService,
    private dataSource: DataSource,
  ) {}

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string) {
    const { email, username, password } = loginDto;

    if (!email && !username) {
      throw new UnauthorizedException('Email or username must be provided');
    }

    let user: HumanOwner | Staff | Business | null = null;
    let entityType: string | undefined;

    const whereClause: FindOptionsWhere<HumanOwner | Staff | Business> = email
      ? { email, status: Status.Active }
      : { username, status: Status.Active };

    user = await this.humanOwnerRepository.findOne({ where: whereClause as FindOptionsWhere<HumanOwner> });
    if (user) entityType = 'HumanOwner';
    else {
      user = await this.staffRepository.findOne({ where: whereClause as FindOptionsWhere<Staff> });
      if (user) entityType = 'Staff';
      else {
        user = await this.businessRepository.findOne({ where: whereClause as FindOptionsWhere<Business> });
        if (user) entityType = 'Business';
      }
    }

    if (!user || !(await bcrypt.compare(password, user.password))) {
      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entity_type: entityType || 'Unknown',
          entity_id: user?.id || 'unknown',
          action: 'Login',
          status: 'Failed',
          ip_address: ipAddress,
          user_agent: userAgent,
        }),
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      username: 'username' in user ? user.username : undefined,
      entityType: entityType,
    };
    const token = this.jwtService.sign(payload, { privateKey: jwtConfig.privateKey });

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        entity_type: entityType!,
        entity_id: user.id,
        action: 'Login',
        status: 'Success',
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    );

    return { 
      access_token: token, 
      entity_type: entityType 
    };
  }

  async registerHumanOwner(dto: RegisterHumanOwnerDto) {
    const { username, name, location, phone, password } = dto;

    // Check for unique username across HumanOwner and Staff
    const usernameExists =
      (await this.humanOwnerRepository.findOne({ where: { username } })) ||
      (await this.staffRepository.findOne({ where: { username } }));

    if (usernameExists) {
      throw new UnauthorizedException('Username already exists');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const otpCode = OtpUtil.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const humanOwner = this.humanOwnerRepository.create({
        username,
        name,
        location,
        phone,
        password: hashedPassword,
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
        otp_type: 'Registration',
      });

      await queryRunner.manager.save(humanOwner);
      await queryRunner.commitTransaction();
      
      return { message: 'Human owner registered successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async registerStaff(dto: RegisterStaffDto) {
    const { username, name, email, password, role, business_id } = dto;

    // Check for unique email across all repositories
    const emailExists =
      (await this.humanOwnerRepository.findOne({ where: { email } })) ||
      (await this.staffRepository.findOne({ where: { email } })) ||
      (await this.businessRepository.findOne({ where: { email } }));

    if (emailExists) {
      throw new UnauthorizedException('Email already exists');
    }

    // Check for unique username across HumanOwner and Staff
    const usernameExists =
      (await this.humanOwnerRepository.findOne({ where: { username } })) ||
      (await this.staffRepository.findOne({ where: { username } }));

    if (usernameExists) {
      throw new UnauthorizedException('Username already exists');
    }

    const business = await this.businessRepository.findOne({ where: { id: business_id } });
    if (!business) throw new NotFoundException('Business not found');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const otpCode = OtpUtil.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const staff = this.staffRepository.create({
        username,
        name,
        email,
        password: hashedPassword,
        role,
        business,
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
        otp_type: 'Registration',
      });

      await this.nodeMailerService.sendOtpEmail(email, otpCode);

      await queryRunner.manager.save(staff);
      await queryRunner.commitTransaction();
      
      return { message: 'OTP sent to email' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async registerBusiness(dto: RegisterBusinessDto) {
    const { name, email, phone, password, description, website, instagram, facebook, x } = dto;

    // Check for unique email across all repositories
    const emailExists =
      (await this.humanOwnerRepository.findOne({ where: { email } })) ||
      (await this.staffRepository.findOne({ where: { email } })) ||
      (await this.businessRepository.findOne({ where: { email } }));

    if (emailExists) {
      throw new UnauthorizedException('Email already exists');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const otpCode = OtpUtil.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const socials = {
        instagram: instagram || null,
        facebook: facebook || null,
        x: x || null,
      };

      const business = this.businessRepository.create({
        name,
        email,
        phone,
        password: hashedPassword,
        description,
        website,
        socials,
        otp_code: otpCode,
        otp_expires_at: otpExpiresAt,
        otp_type: 'Registration',
      });

      await this.nodeMailerService.sendOtpEmail(email, otpCode);
      
      await queryRunner.manager.save(business);
      await queryRunner.commitTransaction();
      
      return { message: 'OTP sent to email' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async verifyOtp(identifier: string, otpCode: string) {
    const whereClause: FindOptionsWhere<HumanOwner | Staff | Business> = identifier.includes('@')
      ? { email: identifier }
      : { username: identifier };

    let user: HumanOwner | Staff | Business | null = null;

    user = await this.humanOwnerRepository.findOne({ where: whereClause as FindOptionsWhere<HumanOwner> });
    if (!user) {
      user = await this.staffRepository.findOne({ where: whereClause as FindOptionsWhere<Staff> });
      if (!user) {
        user = await this.businessRepository.findOne({ where: whereClause as FindOptionsWhere<Business> });
      }
    }

    if (!user || user.otp_code !== otpCode || OtpUtil.isOtpExpired(user.otp_expires_at)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    user.otp_code = null;
    user.otp_expires_at = null;
    user.otp_type = null;

    if (user instanceof HumanOwner) await this.humanOwnerRepository.save(user);
    else if (user instanceof Staff) await this.staffRepository.save(user);
    else await this.businessRepository.save(user);

    return { message: 'OTP verified successfully' };
  }

  async resendOtp(dto: ResendOtpDto) {
    const { email, username, otp_type } = dto;

    if (!email && !username) {
      throw new UnauthorizedException('Email or username must be provided');
    }

    const whereClause: FindOptionsWhere<HumanOwner | Staff | Business> = email
      ? { email, otp_type }
      : { username, otp_type };

    let user: HumanOwner | Staff | Business | null = null;

    user = await this.humanOwnerRepository.findOne({ where: whereClause as FindOptionsWhere<HumanOwner> });
    if (!user) {
      user = await this.staffRepository.findOne({ where: whereClause as FindOptionsWhere<Staff> });
      if (!user) {
        user = await this.businessRepository.findOne({ where: whereClause as FindOptionsWhere<Business> });
      }
    }

    if (!user) throw new NotFoundException('User not found');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const otpCode = OtpUtil.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await this.nodeMailerService.sendOtpEmail(user.email, otpCode);

      user.otp_code = otpCode;
      user.otp_expires_at = otpExpiresAt;
      user.otp_type = otp_type;

      if (user instanceof HumanOwner) await queryRunner.manager.save(user);
      else if (user instanceof Staff) await queryRunner.manager.save(user);
      else await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();
      return { message: 'OTP resent to email' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async forgotPassword(identifier: string) {
    const whereClause: FindOptionsWhere<HumanOwner | Staff | Business> = identifier.includes('@')
      ? { email: identifier }
      : { username: identifier };

    let user: HumanOwner | Staff | Business | null = null;

    user = await this.humanOwnerRepository.findOne({ where: whereClause as FindOptionsWhere<HumanOwner> });
    if (!user) {
      user = await this.staffRepository.findOne({ where: whereClause as FindOptionsWhere<Staff> });
      if (!user) {
        user = await this.businessRepository.findOne({ where: whereClause as FindOptionsWhere<Business> });
      }
    }

    if (!user) throw new NotFoundException('User not found');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const otpCode = OtpUtil.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await this.nodeMailerService.sendOtpEmail(user.email, otpCode);

      user.otp_code = otpCode;
      user.otp_expires_at = otpExpiresAt;
      user.otp_type = 'PasswordReset';

      if (user instanceof HumanOwner) await queryRunner.manager.save(user);
      else if (user instanceof Staff) await queryRunner.manager.save(user);
      else await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();
      return { message: 'OTP sent to email' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { email, username, otp_code, new_password } = dto;

    if (!email && !username) {
      throw new UnauthorizedException('Email or username must be provided');
    }

    const whereClause: FindOptionsWhere<HumanOwner | Staff | Business> = email
      ? { email, otp_code, otp_type: 'PasswordReset' }
      : { username, otp_code, otp_type: 'PasswordReset' };

    let user: HumanOwner | Staff | Business | null = null;

    user = await this.humanOwnerRepository.findOne({ where: whereClause as FindOptionsWhere<HumanOwner> });
    if (!user) {
      user = await this.staffRepository.findOne({ where: whereClause as FindOptionsWhere<Staff> });
      if (!user) {
        user = await this.businessRepository.findOne({ where: whereClause as FindOptionsWhere<Business> });
      }
    }

    if (!user || OtpUtil.isOtpExpired(user.otp_expires_at)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    user.password = await bcrypt.hash(new_password, 10);
    user.otp_code = null;
    user.otp_expires_at = null;
    user.otp_type = null;

    if (user instanceof HumanOwner) await this.humanOwnerRepository.save(user);
    else if (user instanceof Staff) await this.staffRepository.save(user);
    else await this.businessRepository.save(user);

    return { message: 'Password reset successfully' };
  }
}