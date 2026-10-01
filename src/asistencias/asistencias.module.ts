import { Module } from '@nestjs/common';
import { AsistenciasService } from './asistencias.service';
import { AsistenciasController } from './asistencias.controller';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { Asistencia } from './entities/asistencia.entity';
import { CursosModule } from 'src/cursos/cursos.module';
import { InscripcionesModule } from 'src/inscripciones/inscripciones.module';
import { Inscripcion } from 'src/inscripciones/entities/inscripcione.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Asistencia, Inscripcion]),
CursosModule],
  controllers: [AsistenciasController],
  providers: [AsistenciasService],
  exports: [AsistenciasService],
})
export class AsistenciasModule {}
