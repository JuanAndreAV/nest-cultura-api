import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  // Email opcional — si no viene, se genera uno ficticio con el documento
  @ValidateIf(o => !o.documento)
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  nombre: string;

  @IsString()
  apellido: string;

  // Documento requerido si no hay email
  @ValidateIf(o => !o.email)
  @IsString()
  documento?: string;

  @IsEnum(['admin', 'docente', 'estudiante'])
  @IsOptional()
  role?: string;
}