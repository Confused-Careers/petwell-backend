import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTeamDto {
  @IsNotEmpty()
  @IsString()
  pet_id: string;

  @IsNotEmpty()
  @IsString()
  business_id: string;
}