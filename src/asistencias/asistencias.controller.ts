import {
  Controller, Get, Post, Param,
  Body, Query, UseGuards, BadRequestException,
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

  @Post()
  @Roles('admin', 'docente')
  registrar(@Body() dto: CreateAsistenciaDto, @CurrentUser() user: any) {
    return this.asistenciasService.registrar(dto, user);
  }

  @Post('masivo')
  @Roles('admin', 'docente')
  registrarMasivo(@Body() dto: RegistroMasivoDto, @CurrentUser() user: any) {
    return this.asistenciasService.registrarMasivo(dto, user);
  }

  // Historial de un estudiante — el propio estudiante, su docente, o admin
  @Get('inscripcion/:inscripcionId')
listarPorInscripcion(
  @Param('inscripcionId') inscripcionId: string,
  @CurrentUser() user: any,
) {
  return this.asistenciasService.listarPorInscripcion(inscripcionId, user);
}


  @Get('curso/:cursoId/fecha')
  @Roles('admin', 'docente')
  listarPorFecha(
    @Param('cursoId') cursoId: string,
    @Query('fecha') fecha: string,
    @CurrentUser() user: any,
  ) {
    if (!fecha) throw new BadRequestException('Debes indicar una fecha. Ej: ?fecha=2026-03-15');
    return this.asistenciasService.listarPorCursoYFecha(cursoId, fecha, user);
  }

  @Get('curso/:cursoId/resumen')
  @Roles('admin', 'docente')
  resumen(@Param('cursoId') cursoId: string, @CurrentUser() user: any) {
    return this.asistenciasService.resumenPorCurso(cursoId, user);
  }

  @Get('curso/:cursoId/fechas')
  @Roles('admin', 'docente')
  fechas(@Param('cursoId') cursoId: string, @CurrentUser() user: any) {
    return this.asistenciasService.fechasRegistradas(cursoId, user);
  }
 
@Get('inscripcion/:inscripcionId/resumen')
resumenPorInscripcion(
  @Param('inscripcionId') inscripcionId: string,
  @CurrentUser() user: any,
) {
  return this.asistenciasService.resumenPorInscripcion(inscripcionId, user);
}
}