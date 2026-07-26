import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { AulasService } from './aulas.service';
import { CreateAulaDto } from './dto/create-aula.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('aulas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AulasController {
  constructor(private readonly aulasService: AulasService) {}

  @Post()
  @Roles('admin')
  crear(@Body() dto: CreateAulaDto) {
    return this.aulasService.crear(dto);
  }

  @Get()
  listar() {
    return this.aulasService.listar();
  }

  @Get(':id')
  ver(@Param('id') id: string) {
    return this.aulasService.ver(id);
  }

  @Put(':id')
  @Roles('admin')
  actualizar(@Param('id') id: string, @Body() dto: Partial<CreateAulaDto>) {
    return this.aulasService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  desactivar(@Param('id') id: string) {
    return this.aulasService.desactivar(id);
  }
}