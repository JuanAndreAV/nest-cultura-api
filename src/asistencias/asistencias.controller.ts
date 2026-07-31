import {
  Controller, Get, Post, Param,
  Body, Query, UseGuards,
} from '@nestjs/common';
import { AsistenciasService } from './asistencias.service';
import { CreateAsistenciaDto, RegistroMasivoDto } from './dto/create-asistencia.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('asistencias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsistenciasController {
  constructor(private readonly asistenciasService: AsistenciasService) {}

  // Registrar una asistencia — docente o admin
  @Post()
  @Roles('admin', 'docente')
  registrar(@Body() dto: CreateAsistenciaDto, @CurrentUser() user: any) {
    return this.asistenciasService.registrar(dto, user.id);
  }

  // Pasar lista completa de un curso — docente o admin
  @Post('masivo')
  @Roles('admin', 'docente')
  registrarMasivo(@Body() dto: RegistroMasivoDto, @CurrentUser() user: any) {
    return this.asistenciasService.registrarMasivo(dto, user.id);
  }

  // Historial de un estudiante en un curso
  @Get('inscripcion/:inscripcionId')
  listarPorInscripcion(@Param('inscripcionId') inscripcionId: string) {
    return this.asistenciasService.listarPorInscripcion(inscripcionId);
  }

  // Lista de un día específico — para pasar lista
  @Get('curso/:cursoId/fecha')
  @Roles('admin', 'docente')
  listarPorFecha(
    @Param('cursoId') cursoId: string,
    @Query('fecha') fecha: string,
  ) {
    if (!fecha) throw new Error('Debes indicar una fecha. Ej: ?fecha=2026-03-15');
    return this.asistenciasService.listarPorCursoYFecha(cursoId, fecha);
  }

  // Resumen de asistencia por curso — para reportes
  @Get('curso/:cursoId/resumen')
  @Roles('admin', 'docente')
  resumen(@Param('cursoId') cursoId: string) {
    return this.asistenciasService.resumenPorCurso(cursoId);
  }

  // Fechas con clase registradas — para calendario
  @Get('curso/:cursoId/fechas')
  @Roles('admin', 'docente')
  fechas(@Param('cursoId') cursoId: string) {
    return this.asistenciasService.fechasRegistradas(cursoId);
  }
}