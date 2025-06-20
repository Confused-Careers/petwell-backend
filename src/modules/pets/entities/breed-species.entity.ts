import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Breed } from './breed.entity';

@Entity('breed_species')
export class BreedSpecies {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['Dog', 'Cat'] })
  species: 'Dog' | 'Cat';

  @OneToMany(() => Breed, (breed) => breed.breed_species)
  breeds: Breed[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}