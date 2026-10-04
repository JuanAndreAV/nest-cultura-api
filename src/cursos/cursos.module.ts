import { Module } from '@nestjs/common';
import { CursosService } from './cursos.service';
import { CursosController } from './cursos.controller';
import { Horario } from './entities/horario.entity';
import { Curso } from './entities/curso.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { PublicoController } from './cursos.publico.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Curso, Horario])],
  controllers: [CursosController, PublicoController ],
  providers: [CursosService],
  exports: [CursosService],
})
export class CursosModule {}
