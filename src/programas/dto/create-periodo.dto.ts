import { IsString, IsDateString, IsUUID, IsOptional } from 'class-validator';

export class CreatePeriodoDto {
  
 @IsString()
  nombre: string;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;
}