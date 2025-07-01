import { IsNotEmpty, IsString, IsEnum, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  pet_id: string;

  @IsUUID()
  @IsNotEmpty()
  human_owner_id: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsEnum(['VaccineAdded', 'DocumentUploaded', 'VaccineDue', 'PetBirthday'])
  type: 'VaccineAdded' | 'DocumentUploaded' | 'VaccineDue' | 'PetBirthday';
}