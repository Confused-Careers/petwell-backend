import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DocumentType } from '@shared/enums/document-type.enum';

export class UploadDocumentDto {
  @IsString()
  @IsOptional()
  document_name?: string;

  @IsEnum(DocumentType)
  @IsOptional()
  document_type?: DocumentType;

  @IsString()
  @IsOptional()
  file_type?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  pet_id?: string;
}