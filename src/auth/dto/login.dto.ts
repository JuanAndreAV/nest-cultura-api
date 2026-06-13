import { IsEmail, IsString, ValidateIf, MinLength } from "class-validator";

export class LoginDto  {
 @ValidateIf(o => !o.documento)
  @IsEmail()
  email?: string;

  @ValidateIf(o => !o.email)
  @IsString()
  documento?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
