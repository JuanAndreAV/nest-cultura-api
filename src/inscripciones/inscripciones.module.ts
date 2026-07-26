import { Module } from '@nestjs/common';
import { InscripcionesService } from './inscripciones.service';
import { InscripcionesController } from './inscripciones.controller';
import { Inscripcion } from './entities/inscripcione.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { UsuariosModule } from 'src/usuarios/usuarios.module';
import { CursosModule } from 'src/cursos/cursos.module';

@Module({
  imports: [TypeOrmModule.forFeature([Inscripcion]),
CursosModule, UsuariosModule
],
  controllers: [InscripcionesController],
  providers: [InscripcionesService],
})
export class InscripcionesModule {}
