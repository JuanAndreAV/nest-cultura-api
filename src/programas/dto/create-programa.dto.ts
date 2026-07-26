import { IsString, IsOptional, IsHexColor, IsEnum } from 'class-validator';
import { AreaArtistica } from '../entities/programa.entity';

export class CreateProgramaDto {
  @IsString()
  nombre: string;

  @IsEnum(AreaArtistica)
  area: AreaArtistica;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsHexColor()
  @IsOptional()
  colorHex?: string;
}