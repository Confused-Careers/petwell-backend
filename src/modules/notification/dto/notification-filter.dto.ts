import { IsOptional, IsUUID, IsBoolean, IsEnum } from 'class-validator';

export class NotificationFilterDto {
  @IsOptional()
  @IsUUID()
  pet_id?: string;

  @IsOptional()
  @IsBoolean()
  is_read?: boolean;

  @IsOptional()
  @IsEnum(['VaccineAdded', 'DocumentUploaded', 'VaccineDue', 'PetBirthday'])
  type?: 'VaccineAdded' | 'DocumentUploaded' | 'VaccineDue' | 'PetBirthday';
}