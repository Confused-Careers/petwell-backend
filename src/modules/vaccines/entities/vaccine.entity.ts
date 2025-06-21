import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PetProfile } from '../../pets/entities/pet-profile.entity';
import { HumanOwner } from '../../human-owners/entities/human-owner.entity';
import { Staff } from '../../staff/entities/staff.entity';
import { Status } from '../../../shared/enums/status.enum';

@Entity('vaccines')
export class Vaccine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PetProfile, { nullable: false })
  @JoinColumn({ name: 'pet_id' })
  pet: PetProfile;

  @ManyToOne(() => HumanOwner, { nullable: true })
  @JoinColumn({ name: 'human_owner_id' })
  human_owner: HumanOwner;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  preventative: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'date', nullable: true })
  date_administered: Date;

  @Column({ type: 'date', nullable: true })
  date_due: Date;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude: number;

  @Column({ nullable: true })
  attestation: boolean;

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}