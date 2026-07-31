import {
  IsUUID, IsString, IsNumber,
  IsOptional, IsDateString, Min, Max,
} from 'class-validator';

export class CreateNotaDto {
  @IsUUID()
  inscripcionId: string;

  @IsString()
  tipoEvaluacion: string; // 'parcial', 'final', 'proyecto', 'taller'

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  valor: number;

  @IsNumber()
  @IsOptional()
  valorMax?: number;

  @IsString()
  @IsOptional()
  periodoEvaluativo?: string; // 'Corte 1', 'Corte 2', 'Final'

  @IsDateString()
  @IsOptional()
  fecha?: string;
}

export class UpdateNotaDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  valor?: number;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  periodoEvaluativo?: string;
}