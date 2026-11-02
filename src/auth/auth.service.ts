import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { UserRolEntity as UsuarioRol } from './entities/user-rol.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private supabaseClient: SupabaseClient; // consultas y admin
  private authClient: SupabaseClient;     // solo signIn / refresh

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UsuarioRol)
    private readonly rolRepository: Repository<UsuarioRol>,
  ) {
    const opts = { auth: { persistSession: false, autoRefreshToken: false } };
    this.supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      opts,
    );
    this.authClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      opts,
    );
  }

  // ----------------------------------------------------------------
  // LOGIN
  // Soporta email o documento
  // ----------------------------------------------------------------
  async login(loginDto: LoginDto) {
    const { password } = loginDto;

    const email = await this.resolverEmail(loginDto);

    const { data, error } = await this.authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new UnauthorizedException('Credenciales inválidas');

    const perfil = await this.getUserFullProfile(data.user.id);

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: perfil,
    };
  }

  // ----------------------------------------------------------------
  // REFRESH
  // ----------------------------------------------------------------
  async refresh(refreshToken: string) {
    const { data, error } = await this.authClient.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session) throw new UnauthorizedException('Sesión expirada');
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  }

  // ----------------------------------------------------------------
  // REGISTER
  // Soporta registro con email real o sin email (genera ficticio)
  // ----------------------------------------------------------------
  async register(registerDto: RegisterDto) {
    try {
      const { password, nombre, apellido, documento } = registerDto;
      // Nunca confiar en el rol que llega del cliente
      const role = 'estudiante';

      const esFicticio = !registerDto.email;
      const email = registerDto.email?.toLowerCase().trim()
        ?? `cc-${documento}@casacultura.local`;

      const existe = await this.userRepository.findOne({
        where: [
          { email },
          ...(documento ? [{ documento }] : []),
        ],
      });

      if (existe) {
        throw new BadRequestException(
          documento && esFicticio
            ? `Ya existe un usuario con el documento ${documento}.`
            : `El correo ${email} ya está registrado.`,
        );
      }

      // signUp con el cliente de auth, para no mezclar sesiones con las consultas admin
      const { data, error } = await this.authClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            nombre: nombre || '',
          },
        },
      });

      if (error) {
        const message = error?.message ?? String(error ?? 'Error desconocido');
        console.log('Error en signUp:', message);
        throw new BadRequestException('Error en el registro: ' + error.message);
      }

      const userId = data.user!.id;
      const rolNormalizado = this.normalizarRol(role);

      try {
        await this.userRepository.update(userId, {
          apellido:      apellido ?? null,
          documento:     documento ?? null,
          emailFicticio: esFicticio,
        });
      } catch (dbError) {
        this.logger.error(`Error actualizando campos adicionales para ${userId}:`, dbError);
      }

      // El rol lo inserta el trigger 'on_auth_user_created' de Supabase.

      return {
        access_token: data.session?.access_token ?? null,
        user: {
          id:            userId,
          email,
          emailFicticio: esFicticio,
          nombre,
          apellido,
          role:          rolNormalizado,
        },
      };

    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      const message = error?.message ?? String(error ?? 'Error desconocido');
      throw new UnauthorizedException('Error en el registro: ' + message);
    }
  }

  // ----------------------------------------------------------------
  // GET PERFIL COMPLETO
  // Usa la vista v_usuarios_completo para traer roles como array
  // ----------------------------------------------------------------
  async getUserFullProfile(userId: string) {
    const { data: profile, error } = await this.supabaseClient
      .from('v_usuarios_completo')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!user) throw new UnauthorizedException('Usuario no encontrado');
      return user;
    }

    return profile;
  }

  // ----------------------------------------------------------------
  // GESTIÓN DE ROLES
  // ----------------------------------------------------------------
  async asignarRol(usuarioId: string, rol: string): Promise<void> {
    await this.rolRepository
      .createQueryBuilder()
      .insert()
      .into(UsuarioRol)
      .values({ usuarioId, role: this.normalizarRol(rol) })
      .orIgnore()
      .execute();
  }

  async removerRol(usuarioId: string, rol: string): Promise<void> {
    await this.rolRepository.delete({
      usuarioId,
      role: this.normalizarRol(rol),
    });
  }

  // ----------------------------------------------------------------
  // HELPERS PRIVADOS
  // ----------------------------------------------------------------
  private async resolverEmail(loginDto: LoginDto): Promise<string> {
    if (loginDto.email) return loginDto.email.toLowerCase().trim();

    if (loginDto.documento) {
      const user = await this.userRepository.findOne({
        where: { documento: loginDto.documento },
      });
      if (!user) {
        throw new UnauthorizedException('No existe un usuario con ese documento.');
      }
      return user.email;
    }

    throw new BadRequestException('Debes proporcionar email o documento.');
  }

  private normalizarRol(rol: string): string {
    return rol === 'profesor' ? 'docente' : rol;
  }
}