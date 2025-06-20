import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { HumanOwner } from '../../human-owners/entities/human-owner.entity';
import { BreedSpecies } from './breed-species.entity';
import { Breed } from './breed.entity';
import { Status } from '../../../shared/enums/status.enum';

@Entity('pet_profiles')
export class PetProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => HumanOwner)
  @JoinColumn({ name: 'humanOwnerId' })
  human_owner: HumanOwner;

  @Column()
  name: string;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  weight: number;

  @ManyToOne(() => Breed, { nullable: true })
  @JoinColumn({ name: 'breedId' })
  breed: Breed;

  @ManyToOne(() => BreedSpecies)
  @JoinColumn({ name: 'breedSpeciesId' })
  breed_species: BreedSpecies;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitude: number;

  @Column({ nullable: true })
  spay_neuter: boolean;

  @Column({ nullable: true })
  color: string;

  @Column({ type: 'date', nullable: true })
  dob: Date;

  @Column({ nullable: true })
  microchip: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  profile_picture_document_id: string;

  @Column({ nullable: true })
  qr_code_id: string;

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}