import { IsEnum, IsInt, IsString, IsDateString, Min } from 'class-validator';
import { Status } from '@shared/enums/status.enum';

export class CreateLicenseDto {
  @IsDateString()
  purchase_date: string;

  @IsDateString()
  due_date: string;

  @IsString()
  details: string;

  @IsEnum(['Basic', 'Premium', 'Enterprise'])
  license_plan: 'Basic' | 'Premium' | 'Enterprise';

  @IsInt()
  @Min(1)
  duration: number;

  @IsEnum(Status)
  status: Status;
}