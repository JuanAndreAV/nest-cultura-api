import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { CommandFactory } from 'nest-commander/src/command.factory';


async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors(
    {
      origin: [
        'http://localhost:4200',
        'https://giaradotaescultura.web.app/'],
        credentials: true
      
      }

  );//configuración de cors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      
    })
  )
  const port = process.env.PORT || 8080;
  await app.listen(port, '0.0.0.0');
//await CommandFactory.run(AppModule, ['log', 'warn', 'error']);
  
}
bootstrap();
