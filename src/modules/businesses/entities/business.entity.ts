import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Status } from '../../../shared/enums/status.enum';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  website: string;

  @Column({ type: 'jsonb', nullable: true })
  socials: any;

  @Column({ nullable: true })
  profile_picture_document_id: string;

  @Column({ nullable: true })
  license_id: string;

  @Column({ nullable: true })
  qr_code_id: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ type: 'varchar', length: 6, nullable: true })
  otp_code: string;

  @Column({ type: 'timestamp', nullable: true })
  otp_expires_at: Date;

  @Column({ type: 'enum', enum: ['Registration', 'PasswordReset'], nullable: true })
  otp_type: 'Registration' | 'PasswordReset';

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}