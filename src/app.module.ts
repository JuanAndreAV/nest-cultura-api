import { Module, Logger, OnModuleInit} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [AuthModule,
    ConfigModule.forRoot(
      {
        isGlobal: true,
      }
    ),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        // Cargará automáticamente archivos .entity.ts o .entity.js
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // Sincroniza las tablas con tus entidades (Desactivar en prod)
        synchronize: true, 
        ssl: {
          rejectUnauthorized: false, // Requerido para conexiones seguras con Supabase
        },
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger('Database');

  constructor(private dataSource: DataSource) {}

  onModuleInit() {
    const options = this.dataSource.options as PostgresConnectionOptions;

    if (this.dataSource.isInitialized) {
      this.logger.log('✅ Conexión exitosa a la base de datos de Supabase');
      this.logger.log(`Host: ${options.host}`);
      this.logger.log(`Base de datos: ${options.database}`);
    } else {
      this.logger.error('❌ No se pudo establecer la conexión');
    }
  }
  
}
