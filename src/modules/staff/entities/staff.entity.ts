import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Business } from '../../businesses/entities/business.entity';
import { Status } from '../../../shared/enums/status.enum';
import { Document } from '../../documents/entities/document.entity';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Business)
  business: Business;

  @Column({ unique: true })
  username: string;

  @Column()
  staff_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: ['Full', 'Editor', 'View'] })
  access_level: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true })
  token: string;

  @Column({ type: 'enum', enum: ['Vet','Assistant','Manager','Receptionist', 'Staff'], default: 'Staff' })
  role_name: string;
  
  @Column({ nullable: true })
  profile_picture_document_id: string;

  @ManyToOne(() => Document, { nullable: true })
  @JoinColumn({ name: 'profile_picture_document_id' })
  profilePictureDocument: Document;

  @Column({ nullable: true })
  qr_code_id: string;

  @Column({ type: 'varchar', length: 6, nullable: true })
  otp_code: string;

  @Column({ type: 'timestamp', nullable: true })
  otp_sent_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  otp_expires_at: Date;

  @Column({ type: 'enum', enum: ['Registration', 'PasswordReset'], nullable: true })
  otp_type: 'Registration' | 'PasswordReset';

  @Column({ type: 'text', nullable: true })
  previous_passwords: string;

  @Column({ type: 'int', default: 0 })
  login_attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  last_login_attempt: Date;

  @Column({ type: 'int', default: 0 })
  forget_password_attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  last_forget_password_attempt: Date;

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}