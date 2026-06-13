import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      // Extrae el token del header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
     
      //secretOrKey: process.env.SUPABASE_JWT_SECRET!,
      
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksUri: `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
      }),
      algorithms: ['ES256'],
      ignoreExpiration: false,
    });
  }

  // Este método se llama automáticamente después de validar la firma
  // Lo que retorna se inyecta en request.user
  async validate(payload: any) {
    // payload es el JWT decodificado de Supabase
    // contiene: sub (userId), email, role, exp, etc.
    const userId = payload.sub;

    if (!userId) throw new UnauthorizedException('Token inválido');

    // Traer perfil completo con roles desde v_usuarios_completo
    const perfil = await this.authService.getUserFullProfile(userId);

    if (!perfil) throw new UnauthorizedException('Usuario no encontrado');
    if (!perfil.activo) throw new UnauthorizedException('Usuario inactivo');

    return perfil;
    // request.user = perfil (con roles[], es_admin, es_docente, etc.)
  }
}