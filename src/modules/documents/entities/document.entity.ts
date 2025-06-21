import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { PetProfile } from '../../pets/entities/pet-profile.entity';
import { HumanOwner } from '../../human-owners/entities/human-owner.entity';
import { Business } from '../../businesses/entities/business.entity';
import { Staff } from '../../staff/entities/staff.entity';
import { Status } from '../../../shared/enums/status.enum';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PetProfile, { nullable: true })
  pet: PetProfile;

  @ManyToOne(() => HumanOwner, { nullable: true })
  human_owner: HumanOwner;

  @ManyToOne(() => Business, { nullable: true })
  business: Business;

  @ManyToOne(() => Staff, { nullable: true })
  staff: Staff;

  @Column({ type: 'enum', enum: ['Medical', 'License', 'Certificate', 'ProfilePicture', 'QRCode', 'Other'], nullable: false })
  type: 'Medical' | 'License' | 'Certificate' | 'ProfilePicture' | 'QRCode' | 'Other';

  @Column()
  name: string;

  @Column()
  document_url: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ['PDF', 'JPG', 'PNG', 'DOC', 'JPEG'], nullable: false })
  file_type: 'PDF' | 'JPG' | 'PNG' | 'DOC' | 'JPEG';

  @Column({ nullable: true })
  license_reference: string;

  @Column({ type: 'enum', enum: Status, default: Status.Active })
  status: Status;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}