import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, Patch,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/create-usuario.dto';
import { CompletarPerfilDto } from './dto/completar-perfil.dto';
import { FiltroUsuariosDto } from './dto/filtro-usuarios.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompletarPerfilDocenteDto } from './dto/completa-perfil-docente.dto';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {

  constructor(private readonly usuariosService: UsuariosService) {}

  // Crear usuario — solo admin
  @Post('crear')
  @Roles('admin')
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  // Verificar por documento — admin y docente
  @Get('verificar/:documento')
  //@Roles('admin', 'docente')
  verificarDocumento(@Param('documento') documento: string) {
    return this.usuariosService.verificarDocumento(documento);
  }

  
 // Completar perfil — el propio usuario o admin
  @Put(':id/completar-perfil')
  @Roles('admin')
  completarPerfil(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletarPerfilDto,
    @CurrentUser() user: any,
  ) {
    // 1. Determinar si el usuario logueado tiene el rol de administrador
    const esAdmin = Array.isArray(user?.roles) 
      ? user.roles.includes('admin') 
      : Boolean(user?.es_admin || user?.esAdmin);

    // 2. Permitir si es el mismo usuario O si es administrador
    if (user.id !== id && !esAdmin) {
      throw new ForbiddenException('No tienes permiso para editar este perfil.');
    }

    return this.usuariosService.completarPerfil(id, dto);
  }

  @Put(':id/completar-perfil-docente')
  @Roles('admin')
  async completarPerfilDocente(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletarPerfilDocenteDto,
  ) {
    return this.usuariosService.completarPerfilDocente(id, dto);
  }

  // Listar usuarios con filtros — solo admin
  @Get()
  @Roles('admin')
  listar(@Query() filtros: FiltroUsuariosDto) {
    return this.usuariosService.listar(filtros);
  }

  // Marcar inactivos — solo admin
  @Patch('marcar-inactivos')
  @Roles('admin')
  marcarInactivos() {
    return this.usuariosService.marcarInactivos();
  }

  // Eliminar usuario — solo admin
  @Delete(':id')
  @Roles('admin')
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.eliminar(id);
  }
}