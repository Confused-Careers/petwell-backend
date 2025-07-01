import { IsOptional, IsString, IsEmail, IsObject, ValidateIf, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  business_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(['Phone', 'Email'])
  contact_preference?: 'Phone' | 'Email';

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value.trim() !== '') {
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  })
  @ValidateIf((o) => o.socials !== undefined)
  @IsObject({ message: 'socials must be a valid JSON object' })
  socials?: Record<string, any>;

  @IsOptional()
  @IsString()
  description?: string;
}