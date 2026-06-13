import { Module } from '@nestjs/common';
import { ProgramasService } from './programas.service';
import { ProgramasController } from './programas.controller';

@Module({
  controllers: [ProgramasController],
  providers: [ProgramasService],
})
export class ProgramasModule {}
