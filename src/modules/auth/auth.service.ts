import { Injectable, UnauthorizedException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DataSource, EntityManager } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { HumanOwner } from '@modules/human-owners/entities/human-owner.entity';
import { Staff } from '@modules/staff/entities/staff.entity';
import { Business } from '@modules/businesses/entities/business.entity';
import { AuditLog } from '@modules/audit-logs/entities/audit-log.entity';
import { PetProfile } from '@modules/pets/entities/pet-profile.entity';
import { BreedSpecies } from '@modules/pets/entities/breed-species.entity';
import { Breed } from '@modules/pets/entities/breed.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterHumanOwnerDto } from './dto/register-human-owner.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { RegisterHumanOwnerWithPetDto } from './dto/register-human-owner-with-pet.dto';
import { OtpUtil } from '@shared/utils/otp.util';
import { NodeMailerService } from '@shared/services/nodemailer.service';
import { DocumentsService } from '@modules/documents/documents.service';
import { AwsService } from '../../aws/aws.service';
import { jwtConfig } from '@config/jwt.config';
import { Status } from '@shared/enums/status.enum';
import { DocumentType } from '@shared/enums/document-type.enum';
import { UploadDocumentDto } from '@modules/documents/dto/upload-document.dto';
import { Express } from 'express';
import { Document } from '@modules/documents/entities/document.entity';

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
    @InjectRepository(PetProfile)
    private petProfileRepository: Repository<PetProfile>,
    @InjectRepository(BreedSpecies)
    private breedSpeciesRepository: Repository<BreedSpecies>,
    @InjectRepository(Breed)
    private breedRepository: Repository<Breed>,
    private jwtService: JwtService,
    private nodeMailerService: NodeMailerService,
    private documentsService: DocumentsService,
    private awsService: AwsService,
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
    
    if (!user) {
      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entity_type: entityType || 'Unknown',
          entity_id: null,
          action: 'Login',
          status: 'Failed',
          ip_address: ipAddress,
          user_agent: userAgent,
        }),
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (
      (user instanceof HumanOwner || user instanceof Business) &&
      user.is_verified === false
    ) {
      throw new UnauthorizedException('Email not verified');
    }

    user.login_attempts += 1;
    user.last_login_attempt = new Date();
    await (user instanceof HumanOwner
      ? this.humanOwnerRepository.save(user)
      : user instanceof Staff
      ? this.staffRepository.save(user)
      : this.businessRepository.save(user));

    if (!(await bcrypt.compare(password, user.password))) {
      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          entity_type: entityType,
          entity_id: user.id,
          action: 'Login',
          status: 'Failed',
          ip_address: ipAddress,
          user_agent: userAgent,
        }),
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    user.login_attempts = 0;
    await (user instanceof HumanOwner
      ? this.humanOwnerRepository.save(user)
      : user instanceof Staff
      ? this.staffRepository.save(user)
      : this.businessRepository.save(user));

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

    return { access_token: token, entity_type: entityType };
  }

  async registerHumanOwner(dto: RegisterHumanOwnerDto) {
    const { username, human_owner_name, email, location, phone, password } = dto;

    const emailExists =
      (await this.humanOwnerRepository.findOne({ where: { email } })) ||
      (await this.staffRepository.findOne({ where: { email } })) ||
      (await this.businessRepository.findOne({ where: { email } }));

    if (emailExists) {
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }

    const usernameExists =
      (await this.humanOwnerRepository.findOne({ where: { username } })) ||
      (await this.staffRepository.findOne({ where: { username } }));

    if (usernameExists) {
      throw new HttpException('Username already exists', HttpStatus.BAD_REQUEST);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const otpCode = OtpUtil.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const otpSentAt = new Date();

      const humanOwner = this.humanOwnerRepository.create({
        username,
        human_owner_name,
        email,
        location,
        phone,
        password: hashedPassword,
        previous_passwords: JSON.stringify([hashedPassword]),
        otp_code: otpCode,
        otp_sent_at: otpSentAt,
        otp_expires_at: otpExpiresAt,
        otp_type: 'Registration',
      });

      await this.nodeMailerService.sendOtpEmail(email, otpCode);
      await queryRunner.manager.save(humanOwner);
      await queryRunner.commitTransaction();

      return { message: 'OTP sent successfully, please verify it' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async registerStaff(dto: RegisterStaffDto) {
    const { username, staff_name, email, password, role, business_id } = dto;

    const emailExists =
      (await this.humanOwnerRepository.findOne({ where: { email } })) ||
      (await this.staffRepository.findOne({ where: { email } })) ||
      (await this.businessRepository.findOne({ where: { email } }));

    if (emailExists) {
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }

    const usernameExists =
      (await this.humanOwnerRepository.findOne({ where: { username } })) ||
      (await this.staffRepository.findOne({ where: { username } }));

    if (usernameExists) {
      throw new HttpException('Username already exists', HttpStatus.BAD_REQUEST);
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
      const otpSentAt = new Date();

      const staff = this.staffRepository.create({
        username,
        staff_name: staff_name,
        email,
        password: hashedPassword,
        role_name: role,
        business,
        previous_passwords: JSON.stringify([hashedPassword]),
        otp_code: otpCode,
        otp_sent_at: otpSentAt,
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

  async registerBusiness(dto: RegisterBusinessDto, file?: Express.Multer.File) {
    const { business_name, email, phone, password, description, website, instagram, facebook, x, contact_preference, document_name, file_type } = dto;

    const emailExists =
      (await this.humanOwnerRepository.findOne({ where: { email } })) ||
      (await this.staffRepository.findOne({ where: { email } })) ||
      (await this.businessRepository.findOne({ where: { email } }));

    if (emailExists) {
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const otpCode = OtpUtil.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const otpSentAt = new Date();

      const socials = {
        instagram: instagram || null,
        facebook: facebook || null,
        x: x || null,
      };

      const business = this.businessRepository.create({
        business_name: business_name,
        email,
        phone,
        password: hashedPassword,
        description,
        website,
        socials,
        contact_preference,
        previous_passwords: JSON.stringify([hashedPassword]),
        otp_code: otpCode,
        otp_sent_at: otpSentAt,
        otp_expires_at: otpExpiresAt,
        otp_type: 'Registration',
      });

      const savedBusiness = await queryRunner.manager.save(business);

      if (file) {
        const uploadDocumentDto: UploadDocumentDto = {
          document_name: document_name || `profile-picture-${savedBusiness.id}`,
          document_type: DocumentType.ProfilePicture,
          file_type: (file_type as UploadDocumentDto['file_type']) || (['PDF', 'JPG', 'PNG', 'DOC', 'JPEG'].includes(file.mimetype?.split('/')[1]?.toUpperCase() || '') 
            ? file.mimetype?.split('/')[1]?.toUpperCase() as UploadDocumentDto['file_type'] 
            : undefined),
          description: `Profile picture for business ${business_name}`,
        };

        const user = { id: savedBusiness.id, entityType: 'Business' as const };
        const document = await this.documentsService.uploadDocument(uploadDocumentDto, file, user, null, queryRunner.manager);
        business.profile_picture_document_id = document.id;
        await queryRunner.manager.save(business);
      }

      await this.nodeMailerService.sendOtpEmail(email, otpCode);
      await queryRunner.commitTransaction();

      return { message: 'OTP sent to email' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async registerHumanOwnerWithPet(dto: RegisterHumanOwnerWithPetDto, file: Express.Multer.File) {
    const {
      username,
      human_owner_name,
      email,
      location,
      phone,
      password,
      pet_name,
      pet_age,
      pet_species_id,
      pet_breed_id,
      pet_weight,
      pet_spay_neuter,
      pet_color,
      pet_dob,
      pet_microchip,
      pet_notes,
      document_name,
      file_type,
    } = dto;

    const emailExists =
      (await this.humanOwnerRepository.findOne({ where: { email } })) ||
      (await this.staffRepository.findOne({ where: { email } })) ||
      (await this.businessRepository.findOne({ where: { email } }));

    if (emailExists) {
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }

    const usernameExists =
      (await this.humanOwnerRepository.findOne({ where: { username } })) ||
      (await this.staffRepository.findOne({ where: { username } }));

    if (usernameExists) {
      throw new HttpException('Username already exists', HttpStatus.BAD_REQUEST);
    }

    const species = await this.breedSpeciesRepository.findOne({ where: { id: pet_species_id, status: Status.Active } });
    if (!species) {
      throw new NotFoundException('Species not found');
    }

    const breed = await this.breedRepository.findOne({ where: { id: pet_breed_id, status: Status.Active } });
    if (!breed) {
      throw new NotFoundException('Breed not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Register Human Owner
      const hashedPassword = await bcrypt.hash(password, 10);
      const otpCode = OtpUtil.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const otpSentAt = new Date();

      const humanOwner = this.humanOwnerRepository.create({
        username,
        human_owner_name,
        email,
        location,
        phone,
        password: hashedPassword,
        previous_passwords: JSON.stringify([hashedPassword]),
        otp_code: otpCode,
        otp_sent_at: otpSentAt,
        otp_expires_at: otpExpiresAt,
        otp_type: 'Registration',
      });

      const savedHumanOwner = await queryRunner.manager.save(humanOwner);

      // Step 2: Create Pet without image
      const pet = this.petProfileRepository.create({
        human_owner: savedHumanOwner,
        pet_name,
        age: pet_age,
        breed_species: species,
        breed,
        weight: pet_weight,
        spay_neuter: pet_spay_neuter,
        color: pet_color,
        dob: pet_dob ? new Date(pet_dob) : null,
        microchip: pet_microchip,
        notes: pet_notes,
        status: Status.Active,
      });

      const savedPet = await queryRunner.manager.save(pet);

      // Step 3: Upload Document within transaction
      const uploadDocumentDto: UploadDocumentDto = {
        document_name,
        document_type: DocumentType.ProfilePicture,
        file_type,
        description: `Profile picture for pet ${pet_name}`,
        pet_id: savedPet.id,
      };

      const user = { id: savedHumanOwner.id, entityType: 'HumanOwner' as const };
      const document: Document = await this.documentsService.uploadDocument(uploadDocumentDto, file, user, savedPet.id, queryRunner.manager);

      // Step 4: Update Pet with document ID
      savedPet.profile_picture_document_id = document.id;
      await queryRunner.manager.save(savedPet);

      // Step 5: Send OTP
      await this.nodeMailerService.sendOtpEmail(email, otpCode);

      await queryRunner.commitTransaction();

      return { message: 'OTP sent successfully, please verify it' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async verifyOtp(identifier: string, otpCode: string, ipAddress: string, userAgent: string) {
    const whereClause: FindOptionsWhere<HumanOwner | Staff | Business> = identifier.includes('@')
      ? { email: identifier }
      : { username: identifier };

    let user: HumanOwner | Staff | Business | null = null;
    let entityType: string | undefined;

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

    if (!user || user.otp_code !== otpCode || OtpUtil.isOtpExpired(user.otp_expires_at)) {
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
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const isRegistration = user.otp_type === 'Registration';

    user.otp_code = null;
    user.otp_sent_at = null;
    user.otp_expires_at = null;
    user.otp_type = null;
    
    if (user instanceof HumanOwner || user instanceof Business) {
      user.is_verified = true;
      user.status = Status.Active;
    }

    if (user instanceof HumanOwner) await this.humanOwnerRepository.save(user);
    else if (user instanceof Staff) await this.staffRepository.save(user);
    else await this.businessRepository.save(user);

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

    if (isRegistration) {
      const payload = {
        sub: user.id,
        email: user.email,
        username: 'username' in user ? user.username : undefined,
        entityType: entityType,
      };
      const token = this.jwtService.sign(payload, { privateKey: jwtConfig.privateKey });

      return { success: true, message: 'OTP verified successfully', access_token: token, entity_type: entityType };
    }

    return { success: true, message: 'OTP verified successfully' };
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
      const otpSentAt = new Date();

      await this.nodeMailerService.sendOtpEmail(user.email, otpCode);

      user.otp_code = otpCode;
      user.otp_sent_at = otpSentAt;
      user.otp_expires_at = otpExpiresAt;
      user.otp_type = otp_type;

      if (user instanceof HumanOwner) await queryRunner.manager.save(user);
      else if (user instanceof Staff) await queryRunner.manager.save(user);
      else await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();
      return { success: true, message: 'OTP resent to email' };
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

    user.forget_password_attempts += 1;
    user.last_forget_password_attempt = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const otpCode = OtpUtil.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const otpSentAt = new Date();

      await this.nodeMailerService.sendOtpEmail(user.email, otpCode);

      user.otp_code = otpCode;
      user.otp_sent_at = otpSentAt;
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

    const hashedPassword = await bcrypt.hash(new_password, 10);
    let previousPasswords: string[] = [];
    try {
      previousPasswords = JSON.parse(user.previous_passwords || '[]');
    } catch (e) {
      previousPasswords = [];
    }
    previousPasswords.push(hashedPassword);
    user.password = hashedPassword;
    user.previous_passwords = JSON.stringify(previousPasswords);
    user.otp_code = null;
    user.otp_sent_at = null;
    user.otp_expires_at = null;
    user.otp_type = null;
    user.forget_password_attempts = 0;

    if (user instanceof HumanOwner) await this.humanOwnerRepository.save(user);
    else if (user instanceof Staff) await this.staffRepository.save(user);
    else await this.businessRepository.save(user);

    return { message: 'Password reset successfully' };
  }
}