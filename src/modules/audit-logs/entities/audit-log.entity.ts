import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entity_type: string;

  @Column('uuid')
  entity_id: string;

  @Column({ type: 'enum', enum: ['Create', 'Update', 'Delete', 'Login', 'Logout'] })
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: any;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ nullable: true })
  user_agent: string;

  @Column({ type: 'enum', enum: ['Success', 'Failed'] })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}