import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { CursosService } from './cursos.service';
import { CreateCursoDto, CreateHorarioDto } from './dto/create-curso.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('cursos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Post()
  @Roles('admin')
  crear(@Body() dto: CreateCursoDto) {
    return this.cursosService.crear(dto);
  }

  @Get()
  listar(
    @Query('periodoId')    periodoId?: string,
    @Query('asignaturaId') asignaturaId?: string,
    @Query('docenteId')    docenteId?: string,
  ) {
    return this.cursosService.listar({ periodoId, asignaturaId, docenteId });
  }

  @Get(':id')
  ver(@Param('id') id: string) {
    return this.cursosService.ver(id);
  }

  @Put(':id')
  @Roles('admin', 'docente')
  actualizar(@Param('id') id: string, @Body() dto: Partial<CreateCursoDto>) {
    return this.cursosService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  desactivar(@Param('id') id: string) {
    return this.cursosService.desactivar(id);
  }

  // Horarios
  @Post(':id/horarios')
  @Roles('admin', 'docente')
  agregarHorarios(
    @Param('id') id: string,
    @Body() horarios: CreateHorarioDto[],
  ) {
    return this.cursosService.agregarHorarios(id, horarios);
  }

  @Get(':id/horarios')
  horarios(@Param('id') id: string) {
    return this.cursosService.horariosDelCurso(id);
  }

  @Delete('horarios/:id')
  @Roles('admin', 'docente')
  eliminarHorario(@Param('id') id: string) {
    return this.cursosService.eliminarHorario(id);
  }
}