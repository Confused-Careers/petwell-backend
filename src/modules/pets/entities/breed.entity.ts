import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BreedSpecies } from './breed-species.entity';
import { Status } from '../../../shared/enums/status.enum';

@Entity('breeds')
export class Breed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar',length:255 })
  breed_name: string;

  @ManyToOne(() => BreedSpecies, (breedSpecies) => breedSpecies.breeds)
  @JoinColumn({ name: 'breedSpeciesId' })
  breed_species: BreedSpecies;

  @Column({ type: 'text', nullable: true })
  breed_description: string;

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}