import { IsString, IsOptional, IsUUID, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';

export class PensumItemDto {
  @IsUUID()
  programaId: string;

  @IsBoolean()
  @IsOptional()
  obligatoria?: boolean;

  @IsInt()
  @IsOptional()
  orden?: number;
}

export class CreateAsignaturaDto {
  @IsUUID()
  @IsOptional()
  docenteId?: string;

  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  // Programas a los que pertenece esta asignatura
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PensumItemDto)
  @IsOptional()
  programas?: PensumItemDto[];
}