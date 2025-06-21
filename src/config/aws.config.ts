import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';

@Injectable()
export class AwsConfigService {
  private s3: AWS.S3;

  constructor(private configService: ConfigService) {
    AWS.config.update({
      region: this.configService.get<string>('AWS_REGION'),
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    });
    this.s3 = new AWS.S3();
  }

  getS3(): AWS.S3 {
    return this.s3;
  }

  getBucket(): string {
    return this.configService.get<string>('AWS_S3_BUCKET');
  }
}