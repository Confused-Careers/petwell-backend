import { IsOptional, IsString, IsUUID, IsIn } from 'class-validator';

export class FilterRecordsDto {
  @IsOptional()
  @IsString()
  species_id?: string;

  @IsOptional()
  @IsUUID()
  doctor_id?: string;

  @IsOptional()
  @IsIn(['this_week', 'this_month', 'last_3_months'])
  time_period?: 'this_week' | 'this_month' | 'last_3_months';

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}