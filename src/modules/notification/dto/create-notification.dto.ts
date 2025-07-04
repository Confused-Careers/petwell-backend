import { IsNotEmpty, IsString, IsEnum, IsUUID, IsOptional } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  @IsOptional()
  pet_id?: string;

  @IsUUID()
  @IsOptional()
  human_owner_id?: string;

  @IsUUID()
  @IsOptional()
  business_id?: string;

  @IsUUID()
  @IsOptional()
  staff_id?: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(['VaccineAdded', 'DocumentUploaded', 'VaccineDue', 'PetBirthday', 'StaffAdded'])
  type: 'VaccineAdded' | 'DocumentUploaded' | 'VaccineDue' | 'PetBirthday' | 'StaffAdded';
}