import {
  IsString, IsOptional, IsUUID, IsInt,
  IsNumber, IsBoolean, Min, Max, IsArray, ValidateNested, IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiaSemana } from '../entities/horario.entity';

export class CreateHorarioDto {
  @IsEnum(DiaSemana)
  diaSemana: DiaSemana;

  @IsString()
  horaInicio: string; // formato HH:MM

  @IsString()
  horaFin: string;

  @IsUUID()
  @IsOptional()
  aulaId?: string;
}

export class CreateCursoDto {
  @IsUUID()
  asignaturaId: string;

  @IsUUID()
  periodoId: string;

  @IsUUID()
  @IsOptional()
  docenteId?: string;

  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacidadMax?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  edadMin?: number;

  @IsInt()
  @Max(120)
  @IsOptional()
  edadMax?: number;

  @IsNumber()
  @IsOptional()
  intensidadHoraria?: number;

  @IsNumber()
  @IsOptional()
  porcentajeAsistenciaMin?: number;

  @IsNumber()
  @IsOptional()
  notaAprobatoria?: number;

  @IsBoolean()
  @IsOptional()
  requiereNivelPrevio?: boolean;

  @IsUUID()
  @IsOptional()
  cursoPrerequisitorId?: string;

  // Horarios opcionales al crear el curso
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHorarioDto)
  @IsOptional()
  horarios?: CreateHorarioDto[];
}