import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
config();


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Strips properties that are not in the DTO
      forbidNonWhitelisted: true, // Throws error if unknown properties are present
      transform: true,         // Automatically transforms payloads to DTO instances
    }),
  );
  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
