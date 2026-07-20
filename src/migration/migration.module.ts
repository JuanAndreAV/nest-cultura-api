import { Module } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { User } from '../auth/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { MigrationCommand } from './migration.command';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [MigrationService, MigrationCommand],
  exports: [MigrationService],
})
export class MigrationModule {}
