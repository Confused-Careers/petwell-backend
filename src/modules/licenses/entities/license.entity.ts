import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { HumanOwner } from '../../human-owners/entities/human-owner.entity';
import { Business } from '../../businesses/entities/business.entity';
import { Status } from '../../../shared/enums/status.enum';

@Entity('licenses')
export class License {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['HumanOwner', 'Business'] })
  entity_type: 'HumanOwner' | 'Business';

  @Column()
  entity_id: string;

  @Column()
  purchase_date: Date;

  @Column()
  due_date: Date;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ type: 'enum', enum: ['Basic', 'Premium', 'Enterprise'] })
  license_plan: 'Basic' | 'Premium' | 'Enterprise';

  @Column()
  duration: number;

  @Column({ default: true })
  is_valid: boolean;

  @Column({ default: false })
  is_expired: boolean;

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => HumanOwner, { nullable: true })
  human_owner: HumanOwner;

  @ManyToOne(() => Business, { nullable: true })
  business: Business;
}