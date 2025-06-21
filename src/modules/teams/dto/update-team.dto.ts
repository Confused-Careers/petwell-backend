import { IsOptional, IsString } from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  pet_id?: string;

  @IsOptional()
  @IsString()
  business_id?: string;
}