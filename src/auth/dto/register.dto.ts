import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsString({message: "El nombre completo es obligatorio"})
    @MinLength(10, { message: 'El nombre completo debe tener al menos 10 caracteres' })
    @MaxLength(50, { message: 'El nombre completo es muy largo' })
    nombre: string;

  @IsOptional()
  @IsEnum(['admin', 'profesor'], { message: 'Rol no válido' })
  role?: string;

}
