import {
  IsEmail, IsEnum, IsNotEmpty, IsOptional,
  IsString, MinLength, IsArray, IsBoolean,
  IsDateString, IsInt, Min, Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserRole } from '../../auth/entities/user.entity';

export class CrearUsuarioDto {
  // ── Identidad ──────────────────────────────────────────
  @IsNotEmpty({ message: 'El documento es obligatorio' })
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  documento: string;

  @IsNotEmpty({ message: 'El tipo de identificación es obligatorio' })
  @IsString({ message: 'El tipo de identificación debe ser un string' })
  @Transform(({ value }) => value?.toString().trim())
  tipoIdentificacion: string;

  @IsNotEmpty({ message: 'El primer nombre es obligatorio' })
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  nombre: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  segundoNombre?: string;

  @IsNotEmpty({ message: 'El primer apellido es obligatorio' })
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  apellido: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toString().trim())
  segundoApellido?: string;

  @IsOptional()
  @IsString()
  genero?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)' })
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  // Si viene una cadena vacía (""), se transforma en undefined para que @IsOptional() no ejecute @IsEmail()
  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico debe tener un formato válido' })
  @Transform(({ value }) => (value === '' ? undefined : value?.toString().trim()))
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;

  // ── Residencia ─────────────────────────────────────────
  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  barrio?: string;

  @IsOptional()
  @IsString()
  municipio?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsString()
  zonaResidencia?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  @Type(() => Number) // Convierte de string "3" a number 3 automáticamente
  estrato?: number;

  // ── Nacimiento ─────────────────────────────────────────
  @IsOptional()
  @IsString()
  municipioNacimiento?: string;

  @IsOptional()
  @IsString()
  departamentoNacimiento?: string;

  @IsOptional()
  @IsString()
  paisNacimiento?: string;

  // ── Caracterización ────────────────────────────────────
  @IsOptional()
  @IsString()
  enfoquePoblacional?: string;

  @IsOptional()
  @IsBoolean()
  tieneDiscapacidad?: boolean;

  @IsOptional()
  @IsString()
  tipoDiscapacidad?: string;

  @IsOptional()
  @IsString()
  eps?: string;

  // ── Acudiente (menores de edad) ────────────────────────
  @IsOptional()
  @IsString()
  acudienteNombre?: string;

  @IsOptional()
  @IsString()
  acudienteTelefono?: string;

  @IsOptional()
  @IsString()
  acudienteParentesco?: string;

  // ── Roles (Soporta 'roles', 'role' y 'rolesIniciales') ──
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'El rol especificado no es válido' })
  roles?: UserRole[];

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'El rol especificado no es válido' })
  role?: UserRole[];

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'El rol especificado no es válido' })
  rolesIniciales?: UserRole[];
}