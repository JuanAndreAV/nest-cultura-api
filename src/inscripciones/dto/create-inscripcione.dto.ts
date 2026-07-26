import { IsUUID, IsOptional, IsString, IsEnum } from 'class-validator';
import { EstadoInscripcion } from '../entities/inscripcione.entity';

export class CreateInscripcionDto {
  @IsUUID()
  usuarioId: string;

  @IsUUID()
  cursoId: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class CambiarEstadoDto {
  @IsEnum(EstadoInscripcion)
  estado: EstadoInscripcion;

  @IsString()
  @IsOptional()
  observaciones?: string;
}