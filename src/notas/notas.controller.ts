import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { NotasService } from './notas.service';
import { CreateNotaDto, UpdateNotaDto } from './dto/create-nota.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotasController {
  constructor(private readonly notasService: NotasService) {}

  // Registrar nota — docente o admin
  @Post()
  @Roles('admin', 'docente')
  crear(@Body() dto: CreateNotaDto, @CurrentUser() user: any) {
    return this.notasService.crear(dto, user.id);
  }

  // Actualizar nota — docente o admin
  @Put(':id')
  @Roles('admin', 'docente')
  actualizar(@Param('id') id: string, @Body() dto: UpdateNotaDto) {
    return this.notasService.actualizar(id, dto);
  }

  // Eliminar nota — solo admin
  @Delete(':id')
  @Roles('admin')
  eliminar(@Param('id') id: string) {
    return this.notasService.eliminar(id);
  }

  // Notas de una inscripción — estudiante ve las suyas, docente/admin ven todas
  @Get('inscripcion/:inscripcionId')
  listarPorInscripcion(@Param('inscripcionId') inscripcionId: string) {
    return this.notasService.listarPorInscripcion(inscripcionId);
  }

  // Resumen del curso — para dashboard
  @Get('curso/:cursoId/resumen')
  @Roles('admin', 'docente')
  resumen(@Param('cursoId') cursoId: string) {
    return this.notasService.resumenPorCurso(cursoId);
  }

  // Notas por periodo evaluativo — para boletín
  @Get('curso/:cursoId/periodo')
  @Roles('admin', 'docente')
  porPeriodo(
    @Param('cursoId') cursoId: string,
    @Query('periodo') periodo: string,
  ) {
    if (!periodo) throw new Error('Debes indicar un periodo. Ej: ?periodo=Corte 1');
    return this.notasService.listarPorPeriodo(cursoId, periodo);
  }

  // Ficha completa del estudiante — notas agrupadas por periodo
  @Get('ficha/:inscripcionId')
  ficha(@Param('inscripcionId') inscripcionId: string) {
    return this.notasService.fichaEstudiante(inscripcionId);
  }
}