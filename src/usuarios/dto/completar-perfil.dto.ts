// completar-perfil.dto.ts
import { IsString, IsOptional, IsDateString, IsBoolean, IsInt, Min, Max, IsArray } from 'class-validator';

export class CompletarPerfilDto {
  @IsString() @IsOptional() nombre?: string;
  @IsString() @IsOptional() segundoNombre?: string;
  @IsString() @IsOptional() apellido?: string;
  @IsString() @IsOptional() segundoApellido?: string;
  @IsString() @IsOptional() tipoIdentificacion?: string;
  @IsString() @IsOptional() telefono?: string;
  @IsString() @IsOptional() genero?: string;
  @IsDateString() @IsOptional() fechaNacimiento?: string;

  @IsString() @IsOptional() direccion?: string;
  @IsString() @IsOptional() barrio?: string;
  @IsString() @IsOptional() municipio?: string;
  @IsString() @IsOptional() departamento?: string;
  @IsString() @IsOptional() pais?: string;

  @IsString() @IsOptional() municipioNacimiento?: string;
  @IsString() @IsOptional() departamentoNacimiento?: string;
  @IsString() @IsOptional() paisNacimiento?: string;

  @IsString() @IsOptional() zonaResidencia?: string;
  @IsString() @IsOptional() enfoquePoblacional?: string;

  @IsBoolean() @IsOptional() tieneDiscapacidad?: boolean;
  @IsString() @IsOptional() tipoDiscapacidad?: string;

  @IsInt() @Min(1) @Max(6) @IsOptional() estrato?: number;
  @IsString() @IsOptional() eps?: string;

  @IsString() @IsOptional() acudienteNombre?: string;
  @IsString() @IsOptional() acudienteTelefono?: string;
  @IsString() @IsOptional() acudienteParentesco?: string;

  @IsArray() @IsString({ each: true }) @IsOptional() roles?: string[]; // nuevo
}