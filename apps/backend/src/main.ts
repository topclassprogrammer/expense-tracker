import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { patchNestJsSwagger } from 'nestjs-zod';

import { AppModule } from './app.module';

// Учит Swagger читать zod-схемы из createZodDto
patchNestJsSwagger();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN').split(','),
    credentials: true,
  });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Expense Tracker API')
    .setDescription('REST API трекера расходов')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig), {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);

  Logger.log(`API: http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`Swagger: http://localhost:${port}/api/docs`, 'Bootstrap');
}

void bootstrap();
