import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { CursosService } from './cursos.service';
import { CreateCursoDto, CreateHorarioDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('cursos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  // ── Rutas fijas primero ───────────────────────────────────────
  @Post()
  @Roles('admin')
  crear(@Body() dto: CreateCursoDto) {
    return this.cursosService.crear(dto);
  }

  @Get('mis-cursos')
  @Roles('docente', 'admin')
  misCursos(@CurrentUser() user: any) {
    return this.cursosService.misCursos(user.id);
  }

  @Get('disponibles')
  @Roles('admin', 'docente')
  cursosDisponibles(
    @Query('periodoId')  periodoId?: string,
    @Query('programaId') programaId?: string,
    @Query('usuarioId')  usuarioId?: string,
  ) {
    return this.cursosService.cursosDisponibles({ periodoId, programaId, usuarioId });
  }

  @Patch('reasignar-docente')
  @Roles('admin')
  reasignarDocente(
    @Body() body: { desdeDocenteId: string; haciaDocenteId: string; periodoId?: string },
  ) {
    return this.cursosService.reasignarDocente(
      body.desdeDocenteId, body.haciaDocenteId, body.periodoId,
    );
  }

  @Delete('horarios/:id')
  @Roles('admin')
  eliminarHorario(@Param('id', ParseUUIDPipe) id: string) {
    return this.cursosService.eliminarHorario(id);
  }

  @Get()
  @Roles('admin', 'docente')
  listar(
    @Query('periodoId')    periodoId?: string,
    @Query('asignaturaId') asignaturaId?: string,
    @Query('docenteId')    docenteId?: string,
  ) {
    return this.cursosService.listar({ periodoId, asignaturaId, docenteId });
  }

  // ── Rutas con :id después ─────────────────────────────────────
  @Get(':id')
  @Roles('admin', 'docente')
  ver(@Param('id', ParseUUIDPipe) id: string) {
    return this.cursosService.ver(id);
  }

  @Put(':id')
  @Roles('admin')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCursoDto) {
    return this.cursosService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.cursosService.desactivar(id);
  }

  @Post(':id/horarios')
  @Roles('admin')
  agregarHorarios(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() horarios: CreateHorarioDto[],
  ) {
    return this.cursosService.agregarHorarios(id, horarios);
  }

  @Get(':id/horarios')
  @Roles('admin', 'docente')
  horarios(@Param('id', ParseUUIDPipe) id: string) {
    return this.cursosService.horariosDelCurso(id);
  }
}