import { IsString, IsOptional, IsDateString, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class CompletarPerfilDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  apellido?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsDateString()
  @IsOptional()
  fechaNacimiento?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  barrio?: string;

  @IsString()
  @IsOptional()
  municipio?: string;

  @IsString()
  @IsOptional()
  departamento?: string;

  @IsString()
  @IsOptional()
  genero?: string;

  @IsBoolean()
  @IsOptional()
  tieneDiscapacidad?: boolean;

  @IsString()
  @IsOptional()
  tipoDiscapacidad?: string;

  @IsInt()
  @Min(1)
  @Max(6)
  @IsOptional()
  estrato?: number;

  @IsString()
  @IsOptional()
  eps?: string;

  @IsString()
  @IsOptional()
  acudienteNombre?: string;

  @IsString()
  @IsOptional()
  acudienteTelefono?: string;

  @IsString()
  @IsOptional()
  acudienteParentesco?: string;
}