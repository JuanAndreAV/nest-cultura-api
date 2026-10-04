import { Controller, Get, Query } from '@nestjs/common';
import { CursosService } from './cursos.service';

@Controller('publico')
export class PublicoController {
  constructor(private readonly cursosService: CursosService) {}

  @Get('oferta')
  oferta(@Query('periodoId') periodoId?: string) {
    return this.cursosService.ofertaPublica(periodoId);
  }
}