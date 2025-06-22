import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Breed } from './breed.entity';
import { Status } from '../../../shared/enums/status.enum';

@Entity('breed_species')
export class BreedSpecies {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar',length:255 })
  species_name: string;

  @OneToMany(() => Breed, (breed) => breed.breed_species)
  breeds: Breed[];

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;

  @Column({ type: 'text', nullable: true })
  species_description: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}