import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Leer los roles requeridos del decorador @Roles()
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no tiene @Roles(), cualquier usuario autenticado puede acceder
    if (!rolesRequeridos || rolesRequeridos.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

   
    const tieneRol = rolesRequeridos.some(rol => {
      if (rol === 'admin')     return user.es_admin;
      if (rol === 'docente' || rol === 'profesor')   return user.es_docente;
      if (rol === 'estudiante') return user.es_estudiante;
      return user.roles?.includes(rol);
    });

    if (!tieneRol) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere rol: ${rolesRequeridos.join(' o ')}`,
      );
    }

    return true;
  }
}