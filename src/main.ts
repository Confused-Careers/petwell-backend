import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Enable CORS for Vite dev server ports (5173, 5174)
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174', "https://petwellsolutions.com"],
    credentials: true, // if using cookies or Authorization headers
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
