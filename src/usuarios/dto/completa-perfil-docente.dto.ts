import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CompletarPerfilDocenteDto {
  @IsOptional() @IsString() especialidad?: string;
  @IsOptional() @IsString() tipoVinculacion?: string; // 'planta' | 'catedra' | 'externo'
  @IsOptional() @IsNumber() tarifaHora?: number;
  @IsOptional() @IsString() hojaVidaUrl?: string;
  @IsOptional() @IsDateString() fechaVinculacion?: string;
}