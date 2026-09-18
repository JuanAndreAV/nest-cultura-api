import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString } from 'class-validator';

export class CompletarPerfilDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() apellido?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsDateString() fechaNacimiento?: string;
  @IsOptional() @IsString() tipoIdentificacion?: string;
  @IsOptional() @IsString() segundoNombre?: string;
  @IsOptional() @IsString() segundoApellido?: string;
  @IsOptional() @IsString() genero?: string;
  @IsOptional() @IsString() direccion?: string;
  @IsOptional() @IsString() barrio?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() pais?: string;
  @IsOptional() @IsString() municipioNacimiento?: string;
  @IsOptional() @IsString() departamentoNacimiento?: string;
  @IsOptional() @IsString() paisNacimiento?: string;
  @IsOptional() @IsString() zonaResidencia?: string;
  @IsOptional() @IsString() enfoquePoblacional?: string;
  @IsOptional() @IsBoolean() tieneDiscapacidad?: boolean;
  @IsOptional() @IsString() tipoDiscapacidad?: string;
  @IsOptional() @IsNumber() estrato?: number;
  @IsOptional() @IsString() eps?: string;

  // Datos específicos de acudiente para estudiantes (opcional en este DTO)
  @IsOptional() @IsString() acudienteNombre?: string;
  @IsOptional() @IsString() acudienteTelefono?: string;
  @IsOptional() @IsString() acudienteParentesco?: string;
}