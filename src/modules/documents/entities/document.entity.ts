import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { HumanOwner } from '../../human-owners/entities/human-owner.entity';
import { Staff } from '../../staff/entities/staff.entity';
import { Business } from '../../businesses/entities/business.entity';
import { PetProfile } from '../../pets/entities/pet-profile.entity';
import { Status } from '../../../shared/enums/status.enum';
import { DocumentType } from '../../../shared/enums/document-type.enum';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: DocumentType })
  document_type: DocumentType;

  @Column()
  document_name: string;

  @Column()
  document_url: string;

  @Column()
  file_type: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  license_reference: string;

  @ManyToOne(() => HumanOwner, { nullable: true })
  @JoinColumn({ name: 'humanOwnerId' })
  human_owner: HumanOwner;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'staffId' })
  staff: Staff;

  @ManyToOne(() => Business, { nullable: true })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @ManyToOne(() => PetProfile, { nullable: true })
  @JoinColumn({ name: 'petId' })
  pet: PetProfile;

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}