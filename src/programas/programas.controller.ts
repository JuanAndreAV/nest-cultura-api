import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards,
  Query,
} from '@nestjs/common';
import { ProgramasService } from './programas.service';
import { CreateProgramaDto } from './dto/create-programa.dto';
import { CreatePeriodoDto } from './dto/create-periodo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AreaArtistica } from './entities/programa.entity';

@Controller('programas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgramasController {
  constructor(private readonly programasService: ProgramasService) {}

  // ----------------------------------------------------------------
  // RUTAS ESPECÍFICAS / ESTáticas (Primero)
  // ----------------------------------------------------------------

  @Get('areas')
  listarAreas() {
    return this.programasService.listarAreas();
  }

  @Get('periodos')
  listarPeriodos() {
    return this.programasService.listarPeriodos();
  }

  @Get('periodos/activo')
  periodoActivo() {
    return this.programasService.periodoActivo();
  }

  @Get()
  listar(@Query('area') area?: AreaArtistica) {
    return this.programasService.listarProgramas(area);
  }

  // ----------------------------------------------------------------
  // PERIODOS - ACCIONES DE ESCRITURA
  // ----------------------------------------------------------------

  @Post('periodos')
  @Roles('admin')
  crearPeriodo(@Body() dto: CreatePeriodoDto) {
    return this.programasService.crearPeriodo(dto);
  }

  @Put('periodos/:id')
  @Roles('admin')
  actualizarPeriodo(
    @Param('id') id: string,
    @Body() dto: Partial<CreatePeriodoDto>,
  ) {
    return this.programasService.actualizarPeriodo(id, dto);
  }

  @Delete('periodos/:id')
  @Roles('admin')
  desactivarPeriodo(@Param('id') id: string) {
    return this.programasService.desactivarPeriodo(id);
  }

  // ----------------------------------------------------------------
  // PROGRAMAS - ACCIONES DE ESCRITURA Y DINÁMICAS (Al final)
  // ----------------------------------------------------------------

  @Post()
  @Roles('admin')
  crear(@Body() dto: CreateProgramaDto) {
    return this.programasService.crearPrograma(dto);
  }

  @Get(':id')
  ver(@Param('id') id: string) {
    return this.programasService.verPrograma(id);
  }

  @Put(':id')
  @Roles('admin')
  actualizar(@Param('id') id: string, @Body() dto: Partial<CreateProgramaDto>) {
    return this.programasService.actualizarPrograma(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  desactivar(@Param('id') id: string) {
    return this.programasService.desactivarPrograma(id);
  }
}