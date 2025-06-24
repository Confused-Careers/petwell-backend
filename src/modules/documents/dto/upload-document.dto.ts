import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { DocumentType } from '../../../shared/enums/document-type.enum';

export class UploadDocumentDto {
  @IsNotEmpty()
  @IsString()
  document_name: string;

  @IsNotEmpty()
  @IsEnum(DocumentType)
  document_type: DocumentType;

  @IsNotEmpty()
  @IsEnum(['PDF', 'JPG', 'PNG', 'DOC', 'JPEG'])
  file_type: 'PDF' | 'JPG' | 'PNG' | 'DOC' | 'JPEG';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  license_reference?: string;

  @IsString()
  @IsOptional()
  pet_id?: string;

  @IsOptional()
  @IsString()
  
}