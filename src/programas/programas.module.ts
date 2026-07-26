import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramasService } from './programas.service';
import { ProgramasController } from './programas.controller';
import { Periodo } from './entities/periodo.entity';
import { Programa } from './entities/programa.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Programa, Periodo])],
  controllers: [ProgramasController],
  providers: [ProgramasService],
  exports: [ProgramasService],
})
export class ProgramasModule {}
