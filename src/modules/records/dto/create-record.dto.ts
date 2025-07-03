import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRecordDto {
  @IsNotEmpty()
  @IsUUID()
  pet_id: string;

  @IsOptional()
  @IsUUID()
  staff_id?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  title?: string;
}