import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Status } from '../../../shared/enums/status.enum';

@Entity('human_owners')
export class HumanOwner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'varchar', length: 6, nullable: true })
  otp_code: string;

  @Column({ type: 'timestamp', nullable: true })
  otp_expires_at: Date;

  @Column({ type: 'enum', enum: ['Registration', 'PasswordReset'], nullable: true })
  otp_type: 'Registration' | 'PasswordReset';

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;
}