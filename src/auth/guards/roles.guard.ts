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
    // 1. Leer los roles requeridos del decorador @Roles()
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. Si la ruta no exige roles, permite el acceso
    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();



    // Validar que el usuario esté adjunto a la petición y tenga el arreglo de roles
    if (!user || !Array.isArray(user.roles)) {
      throw new ForbiddenException('Acceso denegado. Usuario sin roles asignados.');
    }
    const rolesUsuario = user.roles.map((r: string) => r.toLowerCase());

    // 3. Normalizar alias (ej. mapear 'profesor' -> 'docente')
   const rolesRequeridosNormalizados = rolesRequeridos.map((rol) => {
  const r = rol.toLowerCase();
  return r === 'profesor' ? 'docente' : r;
});

    // 4. Verificar si AL MENOS UNO de los roles requeridos está en user.roles
   const tieneRol = rolesRequeridosNormalizados.some((rolRequerido) =>
  rolesUsuario.includes(rolRequerido),
);
// console.log('Roles requeridos:', rolesRequeridosNormalizados);
// console.log('Roles del usuario:', rolesUsuario);
// console.log('¿El usuario tiene al menos un rol requerido?', tieneRol);

    if (!tieneRol) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de los siguientes roles: ${rolesRequeridos.join(', ')}`,
      );
    }

    return true;
  }
}