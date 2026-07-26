import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateAulaDto {
  @IsString()
  nombre: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacidad?: number;

  @IsString()
  @IsOptional()
  descripcion?: string;
}
