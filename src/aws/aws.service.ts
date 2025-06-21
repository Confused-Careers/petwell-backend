import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { S3 } from "aws-sdk";
import { ConfigService } from "@nestjs/config";
import { Express } from "express";
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class AwsService {
  private s3: S3;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.bucket = process.env.AWS_S3_BUCKET || '';
    this.region = process.env.AWS_REGION || '';

    if (!this.bucket || !this.region) {
      throw new Error('AWS S3 bucket and region must be configured');
    }

    this.s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: this.region,
    });
  }

  async uploadFileToS3(prefix: string, file_name: string, file: Express.Multer.File): Promise<string> {
    try {
      // Validate AWS credentials
      if (!process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY) {
        throw new HttpException('AWS credentials are not configured', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Validate file
      if (!file) {
        throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
      }

      if (!file.buffer) {
        throw new HttpException('File buffer is empty', HttpStatus.BAD_REQUEST);
      }

      if (!file.mimetype) {
        throw new HttpException('File mime type is missing', HttpStatus.BAD_REQUEST);
      }

      // Validate file size (5MB limit)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        throw new HttpException('File size exceeds 5MB limit', HttpStatus.BAD_REQUEST);
      }

      const { originalname, buffer, mimetype } = file;
      const fileName = file_name || `${Date.now()}-${originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const key = `${prefix}${fileName}`;

      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        ContentDisposition: 'inline'
      };

      const uploadResult = await this.s3.upload(params).promise();
      
      if (!uploadResult.Location) {
        throw new HttpException('Failed to get upload URL', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // If CDN is configured, use CDN URL
      if (process.env.AWS_CDN_DEV) {
        return `${process.env.AWS_CDN_DEV}/${key}`;
      }
      
      // If no CDN, use the S3 upload result URL
      return uploadResult.Location;
    } catch (error) {
      console.error('S3 Upload Error:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      // Handle specific AWS errors
      if (error.code === 'AccessDenied') {
        throw new HttpException('AWS access denied. Please check credentials and permissions', HttpStatus.FORBIDDEN);
      }
      
      if (error.code === 'NoSuchBucket') {
        throw new HttpException('S3 bucket does not exist', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      throw new HttpException(
        `Error while uploading file to S3 bucket: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async uploadMultiFilesToS3(files: Express.Multer.File[], prefix: string = '') {
    try {
      if (!files || !Array.isArray(files) || files.length === 0) {
        throw new HttpException('No files provided', HttpStatus.BAD_REQUEST);
      }

      const uploadPromises = files.map(file => 
        this.uploadFileToS3(prefix, '', file)
      );

      const results = await Promise.all(uploadPromises);
      return {
        fileResult: results,
        asset_url: results.join(',')
      };
    } catch (error) {
      console.error('Multi-file S3 Upload Error:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Error while uploading multiple files to S3 bucket: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}