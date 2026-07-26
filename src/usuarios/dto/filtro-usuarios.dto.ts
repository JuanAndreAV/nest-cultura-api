import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class FiltroUsuariosDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  rol?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  soloSinInscripcion?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  pagina?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  porPagina?: number = 20;
}