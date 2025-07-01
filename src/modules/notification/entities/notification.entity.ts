import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { HumanOwner } from '../../human-owners/entities/human-owner.entity';
import { PetProfile } from '../../pets/entities/pet-profile.entity';
import { Status } from '../../../shared/enums/status.enum';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => HumanOwner, { nullable: false })
  @JoinColumn({ name: 'human_owner_id' })
  human_owner: HumanOwner;

  @ManyToOne(() => PetProfile, { nullable: false })
  @JoinColumn({ name: 'pet_id' })
  pet: PetProfile;

  @Column()
  message: string;

  @Column({ type: 'enum', enum: ['VaccineAdded', 'DocumentUploaded', 'VaccineDue', 'PetBirthday'] })
  type: 'VaccineAdded' | 'DocumentUploaded' | 'VaccineDue' | 'PetBirthday';

  @Column({ default: false })
  is_read: boolean;

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}