import { IsString, MinLength, IsBoolean } from 'class-validator';

export class PasswordDto {
  @IsString() @MinLength(6) password: string;
}

export class ActivoDto {
  @IsBoolean() activo: boolean;
}