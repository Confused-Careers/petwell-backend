import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateBusinessPetMappingDto {
  @IsOptional()
  @IsUUID()
  pet_id?: string;

  @IsOptional()
  @IsString()
  qr_code_id?:string;

  @IsOptional()
  @IsUUID()
  staff_id?: string;

  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  note?: string;
}