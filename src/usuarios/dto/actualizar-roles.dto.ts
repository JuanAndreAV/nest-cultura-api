// src/usuarios/dto/actualizar-roles.dto.ts
import { IsArray, IsEnum, ArrayMinSize } from 'class-validator';
import { UserRole } from '../../auth/entities/user.entity';

export class ActualizarRolesDto {
  @IsArray()
  @IsEnum(UserRole, { each: true })
  @ArrayMinSize(1, { message: 'El usuario debe tener al menos un rol' })
  roles: UserRole[];
}