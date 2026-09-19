import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../auth/entities/user.entity';

export class CrearUsuarioDto {
  @IsNotEmpty({ message: 'El documento es obligatorio' })
  @IsString()
  @Transform(({ value }) => value?.toString())
  documento: string;

  @IsNotEmpty({ message: 'El tipo de identificación es obligatorio' })
  @IsString({ message: 'El tipo de identificación debe ser un string' })
  @Transform(({ value }) => value?.toString())
  tipoIdentificacion: string;

  @IsNotEmpty({ message: 'El primer nombre es obligatorio' })
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  segundoNombre?: string;

  @IsNotEmpty({ message: 'El primer apellido es obligatorio' })
  @IsString()
  apellido: string;

  @IsOptional()
  @IsString()
  segundoApellido?: string;

  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  @IsEmail({}, { message: 'El correo electrónico debe tener un formato válido' })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'Rol no válido' })
  role?: UserRole[];
}