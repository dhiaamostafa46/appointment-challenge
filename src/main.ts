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

  // OpenAPI Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fixed-Slot Appointment Booking API')
    .setDescription(
      'Modular Clean Architecture API for fixed-slot appointment bookings with PostgreSQL row-level locks (SELECT ... FOR UPDATE), Socket.IO real-time events, and Swagger documentation.'
    )
    .setVersion('1.0.0')
    .addTag('Slots', 'Fixed appointment slots operations')
    .addTag('Bookings', 'Slot reservations and cancellation operations')
    .addTag('Health', 'System status checks')
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
