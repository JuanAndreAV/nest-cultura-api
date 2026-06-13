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
  private supabaseClient: SupabaseClient; 

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UsuarioRol)
    private readonly rolRepository: Repository<UsuarioRol>,
  ) {
    this.supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  // ----------------------------------------------------------------
  // LOGIN
  // Soporta email o documento
  // ----------------------------------------------------------------
  async login(loginDto: LoginDto) {
    const { password } = loginDto;

    const email = await this.resolverEmail(loginDto);

    const { data, error } = await this.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new UnauthorizedException('Credenciales inválidas');

      const perfil = await this.getUserFullProfile(data.user.id);

    return {  
      access_token: data.session.access_token,
      user: perfil,
    };
  }

  // ----------------------------------------------------------------
  // REGISTER
  // Soporta registro con email real o sin email (genera ficticio)
  // ----------------------------------------------------------------
  async register(registerDto: RegisterDto) {
    try {
      const { password, role, nombre, apellido, documento } = registerDto;

      // Resolver email — real o ficticio
      const esFicticio = !registerDto.email;
      const email = registerDto.email?.toLowerCase().trim()
        ?? `cc-${documento}@casacultura.local`;

      // Verificar duplicado por email o por documento
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

      // Registrar en Supabase Auth
      const { data, error } = await this.supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            role:   role || 'estudiante',
            nombre: nombre || '',
          },
        },
      });

      if (error) {
        throw new BadRequestException('Error en el registro: ' + error.message);
      }

      const userId = data.user!.id;

      // Completar public.users con los datos adicionales
      // El trigger ya creó la fila básica al hacer signUp
      await this.userRepository.update(userId, {
        apellido:      apellido ?? null,
        documento:     documento ?? null,
        emailFicticio:  esFicticio,
      });

      // Asignar rol en usuario_roles
      const rolNormalizado = this.normalizarRol(role || 'estudiante');
      await this.rolRepository
        .createQueryBuilder()
        .insert()
        .into(UsuarioRol)
        .values({ usuarioId: userId, rol: rolNormalizado })
        .orIgnore()
        .execute();

      return {
        access_token:  data.session?.access_token ?? null,
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
      // Relanzar BadRequestException sin envolverla
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
      // Fallback a public.users si la vista falla
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!user) throw new UnauthorizedException('Usuario no encontrado');
      return user;
    }

    // profile tendrá: { id, email, nombre, apellido, roles: ['admin','docente'],
    //                   es_admin, es_docente, es_estudiante, ... }
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
      .values({ usuarioId, rol: this.normalizarRol(rol) })
      .orIgnore()
      .execute();
  }

  async removerRol(usuarioId: string, rol: string): Promise<void> {
    await this.rolRepository.delete({
      usuarioId,
      rol: this.normalizarRol(rol),
    });
  }

  // ----------------------------------------------------------------
  // HELPERS PRIVADOS
  // ----------------------------------------------------------------

  // Resuelve el email para autenticar — directo o buscando por documento
  private async resolverEmail(loginDto: LoginDto): Promise<string> {
    if (loginDto.email) return loginDto.email.toLowerCase().trim();

    if (loginDto.documento) {
      const user = await this.userRepository.findOne({
        where: { documento: loginDto.documento },
      });
      if (!user) {
        throw new UnauthorizedException('No existe un usuario con ese documento.');
      }
      return user.email; // puede ser ficticio, Supabase lo maneja igual
    }

    throw new BadRequestException('Debes proporcionar email o documento.');
  }

  // Normaliza 'profesor' → 'docente' para nuevos registros
  private normalizarRol(rol: string): string {
    return rol === 'profesor' ? 'docente' : rol;
  }
}


 
  // update(id: number, updateAuthDto: UpdateAuthDto) {
  //   return `This action updates a #${id} auth`;
  // }

 