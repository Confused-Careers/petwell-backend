import { IsOptional, IsUUID, IsBoolean, IsEnum } from 'class-validator';

export class NotificationFilterDto {
  @IsOptional()
  @IsUUID()
  pet_id?: string;

  @IsOptional()
  @IsUUID()
  human_owner_id?: string;

  @IsOptional()
  @IsUUID()
  business_id?: string;

  @IsOptional()
  @IsUUID()
  staff_id?: string;

  @IsOptional()
  @IsBoolean()
  is_read?: boolean;

  @IsOptional()
  @IsEnum(['VaccineAdded', 'DocumentUploaded', 'VaccineDue', 'PetBirthday', 'StaffAdded'])
  type?: 'VaccineAdded' | 'DocumentUploaded' | 'VaccineDue' | 'PetBirthday' | 'StaffAdded';
}