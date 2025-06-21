import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { HumanOwner } from '../../human-owners/entities/human-owner.entity';
import { PetProfile } from '../../pets/entities/pet-profile.entity';
import { Business } from '../../businesses/entities/business.entity';
import { Status } from '../../../shared/enums/status.enum';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => HumanOwner, { nullable: false })
  human_owner: HumanOwner;

  @ManyToOne(() => PetProfile, { nullable: false })
  pet: PetProfile;

  @ManyToOne(() => Business, { nullable: false })
  business: Business;

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}