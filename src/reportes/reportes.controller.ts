import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'docente')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  // KPIs del dashboard — cards principales
  @Get('kpis')
  kpis() {
    return this.reportesService.kpis();
  }

  // Estado de todos los cursos
  @Get('cursos')
  estadoCursos(
    @Query('periodoId') periodoId?: string,
    @Query('programa')  programa?: string,
    @Query('activo')    activo?: string,
  ) {
    return this.reportesService.estadoCursos({
      periodoId,
      programa,
      activo: activo !== undefined ? activo === 'true' : undefined,
    });
  }

  // Resumen de asistencia
  @Get('asistencia')
  asistencia(
    @Query('cursoId')   cursoId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('estado')    estado?: string,
  ) {
    return this.reportesService.asistenciaResumen({ cursoId, usuarioId, estado });
  }

  // Resumen de notas
  @Get('notas')
  notas(
    @Query('cursoId')   cursoId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('estado')    estado?: string,
  ) {
    return this.reportesService.notasResumen({ cursoId, usuarioId, estado });
  }

  // Programación de aulas — calendar view
  @Get('aulas')
  aulas(
    @Query('aulaId')    aulaId?: string,
    @Query('diaSemana') diaSemana?: string,
    @Query('periodo')   periodo?: string,
  ) {
    return this.reportesService.programacionAulas({ aulaId, diaSemana, periodo });
  }

  // Ficha individual del estudiante en un curso
  @Get('ficha')
  ficha(
    @Query('estudianteId')  estudianteId?: string,
    @Query('cursoId')       cursoId?: string,
    @Query('inscripcionId') inscripcionId?: string,
  ) {
    return this.reportesService.fichaEstudianteCurso({
      estudianteId,
      cursoId,
      inscripcionId,
    });
  }

  // Listado de docentes
  @Get('docentes')
  docentes() {
    return this.reportesService.docentes();
  }

  // Usuarios completos con roles
  @Get('usuarios')
  @Roles('admin')
  usuarios(
    @Query('esAdmin')      esAdmin?: string,
    @Query('esDocente')    esDocente?: string,
    @Query('esEstudiante') esEstudiante?: string,
    @Query('activo')       activo?: string,
  ) {
    return this.reportesService.usuariosCompleto({
      esAdmin:      esAdmin      !== undefined ? esAdmin      === 'true' : undefined,
      esDocente:    esDocente    !== undefined ? esDocente    === 'true' : undefined,
      esEstudiante: esEstudiante !== undefined ? esEstudiante === 'true' : undefined,
      activo:       activo       !== undefined ? activo       === 'true' : undefined,
    });
  }
}