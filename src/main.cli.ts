// src/main.cli.ts
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';

async function bootstrap() {
  await CommandFactory.run(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
    errorHandler: (err) => {
      console.error('❌ Error ejecutando el comando CLI:', err);
      process.exit(1);
    },
  });
}

bootstrap();