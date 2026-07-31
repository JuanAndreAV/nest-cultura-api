import {
  Controller, Get, Post, Patch,
  Param, Body, UseGuards, Query,
} from '@nestjs/common';
import { InscripcionesService } from './inscripciones.service';
import { CreateInscripcionDto, CambiarEstadoDto } from './dto/create-inscripcione.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('inscripciones')

export class InscripcionesController {
  constructor(private readonly inscripcionesService: InscripcionesService) {}

  // Pre-inscripción desde link del profesor — cualquier autenticado
  @Post('pre-inscribir')
  preInscribir(@Body() dto: CreateInscripcionDto) {
    return this.inscripcionesService.preInscribir(dto);
  }

  // Inscripción directa — solo admin
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  inscribir(@Body() dto: CreateInscripcionDto) {
    return this.inscripcionesService.inscribir(dto);
  }

  // Aprobar pre-inscripción — admin o docente
  @Patch(':id/aprobar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'docente')
  aprobar(@Param('id') id: string, @CurrentUser() user: any) {
    return this.inscripcionesService.aprobar(id, user);
  }

  // Cambiar estado — admin, docente, o el propio estudiante
  //pendiente de revisar este punto, ya que el estudiante no debería poder cambiar su estado a activa o cancelada, solo a cancelada
  @Patch(':id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'docente')
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser() user: any,
  ) {
    return this.inscripcionesService.cambiarEstado(id, dto, user);
  }

  // Listar por curso — admin y docente
  @Get('curso/:cursoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'docente')
  listarPorCurso(@Param('cursoId') cursoId: string) {
    return this.inscripcionesService.listarPorCurso(cursoId);
  }

  // Listar por estudiante — el propio estudiante o admin
  @Get('estudiante/:usuarioId')
  listarPorEstudiante(
    @Param('usuarioId') usuarioId: string,
    @CurrentUser() user: any,
  ) {
    if (!user.es_admin && user.id !== usuarioId) {
      throw new Error('No puedes ver las inscripciones de otro estudiante.');
    }
    return this.inscripcionesService.listarPorEstudiante(usuarioId);
  }

  // Listar pendientes — admin ve todas, docente ve las de sus cursos
  @Get('pendientes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'docente')
  listarPendientes(@CurrentUser() user: any) {
    const docenteId = user.es_admin ? undefined : user.id;
    return this.inscripcionesService.listarPendientes(docenteId);
  }
}