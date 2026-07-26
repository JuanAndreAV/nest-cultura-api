import { Module } from '@nestjs/common';
import { AsignaturasService } from './asignaturas.service';
import { AsignaturasController } from './asignaturas.controller';
import { Asignatura } from './entities/asignatura.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';
import { Pensum } from 'src/programas/entities/pensum.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Asignatura, Pensum])],
  controllers: [AsignaturasController],
  providers: [AsignaturasService],
  exports: [AsignaturasService],
})
export class AsignaturasModule {}
