import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import path from 'path';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

import { AppValidationPipe } from './common/validation/validation.pipe';

export async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? '*' },
  });

  // Global Validation Pipe
  app.useGlobalPipes(new AppValidationPipe());

  // Global Exception Filter
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Serve Interactive Dashboard
  app.useStaticAssets(path.resolve(process.cwd(), 'public'));

  // OpenAPI Swagger Documentation Setup (Exact Challenge Specification)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fixed-Slot Appointment Booking API')
    .setDescription(
      'RESTful API for fixed-slot appointment booking with strict concurrency conflict prevention, PostgreSQL row-level locks, and Socket.IO real-time events. No authentication required.'
    )
    .setVersion('1.0.0')
    .addTag('Slots', 'Query available appointment slots (GET /slots)')
    .addTag('Bookings', 'Slot reservation (POST /bookings) and cancellation (DELETE /bookings/{bookingId})')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Expose raw openapi.json
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/openapi.json', (_req: any, res: any) => res.json(document));

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  console.log(`🚀 NestJS Appointment Booking API listening on http://localhost:${port}`);
  console.log(`📘 Interactive Swagger Documentation: http://localhost:${port}/docs`);
  console.log(`⚡ Interactive Visual Studio: http://localhost:${port}/`);
  return app;
}

if (require.main === module) {
  bootstrap();
}
