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
//@UseGuards(JwtAuthGuard, RolesGuard)
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @Get('disponibles')
  cursosDisponibles(
  @Query('periodoId')  periodoId?: string,
  @Query('programaId') programaId?: string,
  @Query('usuarioId')  usuarioId?: string,
) {
  return this.cursosService.cursosDisponibles({
    periodoId,
    programaId,
    usuarioId,
  });
}

  @Get(':id')
  ver(@Param('id') id: string) {
    return this.cursosService.ver(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'docente')
  actualizar(@Param('id') id: string, @Body() dto: Partial<CreateCursoDto>) {
    return this.cursosService.actualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  desactivar(@Param('id') id: string) {
    return this.cursosService.desactivar(id);
  }

  // Horarios
  @Post(':id/horarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'docente')
  agregarHorarios(
    @Param('id') id: string,
    @Body() horarios: CreateHorarioDto[],
  ) {
    return this.cursosService.agregarHorarios(id, horarios);
  }

  @Get(':id/horarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  horarios(@Param('id') id: string) {
    return this.cursosService.horariosDelCurso(id);
  }

  @Delete('horarios/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  eliminarHorario(@Param('id') id: string) {
    return this.cursosService.eliminarHorario(id);
  }
}