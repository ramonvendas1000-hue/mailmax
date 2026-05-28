import { NestFactory, Reflector } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import multipart from '@fastify/multipart';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { ResponseInterceptor } from './shared/middleware/response.interceptor';
import { AllExceptionsFilter } from './shared/middleware/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' } }),
  );

  await app.register(multipart as any, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.enableCors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true,
  });

  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('MailMax Pro API')
    .setDescription('Email Marketing SaaS - API completa')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3001, '0.0.0.0');
  console.log(`API rodando em http://localhost:3001`);
  console.log(`Swagger disponível em http://localhost:3001/docs`);
}

bootstrap();
