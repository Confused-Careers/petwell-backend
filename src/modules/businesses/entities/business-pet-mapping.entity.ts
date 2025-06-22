import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Business } from './business.entity';
import { PetProfile } from '../../pets/entities/pet-profile.entity';
import { Staff } from '../../staff/entities/staff.entity';

@Entity('business_pet_mapping')
export class BusinessPetMapping {
  @PrimaryGeneratedColumn('uuid')
  map_id: string;

  @ManyToOne(() => Business, { nullable: false })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ManyToOne(() => PetProfile, { nullable: false })
  @JoinColumn({ name: 'pet_id' })
  pet: PetProfile;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}