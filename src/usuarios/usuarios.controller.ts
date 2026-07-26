import {
  Controller, Get, Put, Delete,
  Param, Body, Query, UseGuards, Patch,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CompletarPerfilDto } from './dto/completar-perfil.dto';
import { FiltroUsuariosDto } from './dto/filtro-usuarios.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {

  constructor(private readonly usuariosService: UsuariosService) {}

  // Verificar por documento — admin y docente
  @Get('verificar/:documento')
  @Roles('admin', 'docente')
  verificarDocumento(@Param('documento') documento: string) {
    return this.usuariosService.verificarDocumento(documento);
  }

  // Completar perfil — el propio usuario o admin
  @Put(':id/completar-perfil')
  completarPerfil(
    @Param('id') id: string,
    @Body() dto: CompletarPerfilDto,
    @CurrentUser() user: any,
  ) {
    // Solo admin puede completar el perfil de otro usuario
    if (user.id !== id && !user.es_admin) {
      throw new Error('No tienes permiso para editar este perfil.');
    }
    return this.usuariosService.completarPerfil(id, dto);
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
  eliminar(@Param('id') id: string) {
    return this.usuariosService.eliminar(id);
  }
}