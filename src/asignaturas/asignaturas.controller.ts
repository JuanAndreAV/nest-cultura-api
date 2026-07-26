import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, Patch,
} from '@nestjs/common';
import { AsignaturasService } from './asignaturas.service';
import { CreateAsignaturaDto, PensumItemDto } from './dto/create-asignatura.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('asignaturas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsignaturasController {
  constructor(private readonly asignaturasService: AsignaturasService) {}

  @Post()
  @Roles('admin')
  crear(@Body() dto: CreateAsignaturaDto) {
    return this.asignaturasService.crear(dto);
  }

  @Get()
  listar(@Query('programaId') programaId?: string) {
    return this.asignaturasService.listar(programaId);
  }

  @Get(':id')
  ver(@Param('id') id: string) {
    return this.asignaturasService.ver(id);
  }

  @Put(':id')
  @Roles('admin')
  actualizar(@Param('id') id: string, @Body() dto: Partial<CreateAsignaturaDto>) {
    return this.asignaturasService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  desactivar(@Param('id') id: string) {
    return this.asignaturasService.desactivar(id);
  }

  // Pensum
  @Post(':id/programas')
  @Roles('admin')
  asociarProgramas(
    @Param('id') id: string,
    @Body() programas: PensumItemDto[],
  ) {
    return this.asignaturasService.asociarProgramas(id, programas);
  }

  @Get(':id/programas')
  programasDeAsignatura(@Param('id') id: string) {
    return this.asignaturasService.programasDeAsignatura(id);
  }

  @Patch(':id/programas/:programaId')
  @Roles('admin')
  actualizarPensum(
    @Param('id') id: string,
    @Param('programaId') programaId: string,
    @Body() datos: { obligatoria?: boolean; orden?: number },
  ) {
    return this.asignaturasService.actualizarPensum(id, programaId, datos);
  }

  @Delete(':id/programas/:programaId')
  @Roles('admin')
  desasociarPrograma(
    @Param('id') id: string,
    @Param('programaId') programaId: string,
  ) {
    return this.asignaturasService.desasociarPrograma(id, programaId);
  }
}