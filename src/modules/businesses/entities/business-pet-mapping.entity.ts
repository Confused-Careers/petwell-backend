import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { Business } from './business.entity';
import { PetProfile } from '@modules/pets/entities/pet-profile.entity';

@Entity('business_pet_mapping')
export class BusinessPetMapping {
  @PrimaryGeneratedColumn('uuid')
  map_id: string;

  @OneToOne(() => Business, { nullable: false })
  business: Business;
  
  @OneToOne(() => PetProfile, { nullable: false })
  pet: PetProfile;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}