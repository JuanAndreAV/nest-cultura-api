import {
  IsUUID, IsBoolean, IsDateString,
  IsOptional, IsString, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAsistenciaDto {
  @IsUUID()
  inscripcionId: string;

  @IsDateString()
  fecha: string;

  @IsBoolean()
  asistio: boolean;

  @IsString()
  @IsOptional()
  observacion?: string;
}

// Para registrar asistencia de todo un curso en una fecha
export class RegistroMasivoDto {
  @IsUUID()
  cursoId: string;

  @IsDateString()
  fecha: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsistenciaItemDto)
  asistencias: AsistenciaItemDto[];
}

export class AsistenciaItemDto {
  @IsUUID()
  inscripcionId: string;

  @IsBoolean()
  asistio: boolean;

  @IsString()
  @IsOptional()
  observacion?: string;
}