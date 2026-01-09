import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = process.env.SUPABASE_URL; //this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = process.env.SUPABASE_KEY; //this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL y ANON_KEY deben estar configurados');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        console.log('Error al validar token:', error?.message);
        throw new UnauthorizedException('Token inválido');
      }

      console.log('✅ Usuario autenticado:', user.email);
      
      // Agregar el usuario al request para usarlo en el controller
      request.user = {
        userId: user.id,
        email: user.email,
        role: user.user_metadata?.role,
        fullUser: user // Por si necesitas más datos
      };
      
      return true;
    } catch (error) {
      console.log('Error en guard:', error.message);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;
    
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}