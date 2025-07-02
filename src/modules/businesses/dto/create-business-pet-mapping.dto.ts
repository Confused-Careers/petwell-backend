import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateBusinessPetMappingDto {
  @IsOptional()
  @IsUUID('4', { message: 'pet_id must be a valid UUID' })
  pet_id?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'qr_code_id must be a non-empty string' })
  qr_code_id?: string;

  @IsOptional()
  @IsUUID('4', { message: 'staff_id must be a valid UUID' })
  staff_id?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'title must be a non-empty string' })
  title?: string;

  @IsOptional()
  @IsString()
  note?: string;
}