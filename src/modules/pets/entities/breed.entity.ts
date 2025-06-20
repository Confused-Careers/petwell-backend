import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BreedSpecies } from './breed-species.entity';

@Entity('breeds')
export class Breed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => BreedSpecies, (breedSpecies) => breedSpecies.breeds)
  @JoinColumn({ name: 'breedSpeciesId' })
  breed_species: BreedSpecies;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}