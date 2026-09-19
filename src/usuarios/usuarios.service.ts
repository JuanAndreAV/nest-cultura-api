import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { User, UserRole } from '../auth/entities/user.entity';
import { CrearUsuarioDto } from './dto/create-usuario.dto';
import { CompletarPerfilDto } from './dto/completar-perfil.dto';
import { CompletarPerfilDocenteDto } from './dto/completa-perfil-docente.dto';
import { FiltroUsuariosDto } from './dto/filtro-usuarios.dto';
import { ActualizarRolesDto } from './dto/actualizar-roles.dto';

// IDs protegidos — nunca se alteran ni eliminan de la BD
const IDS_PROTEGIDOS = new Set([
  '45559c1e-2c7d-48d1-9fb6-a78eef91194b',
  '32eefbd0-4b40-4cf2-8fab-df1b7bd9efa2',
  'e99c7b47-58ef-4fc5-8053-b2c1bc2c337c',
  'b31c33f0-10e9-4e34-b41a-4fd2f2c28f42',
]);

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);
  private supabase: SupabaseClient;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  // ================================================================
  // 1. CREACIÓN Y VERIFICACIÓN BASE DE USUARIOS
  // ================================================================

  /**
   * Crear un nuevo usuario en Supabase Auth y sincronizar en public.users (Admin)
   */
  async crear(dto: CrearUsuarioDto) {
    // Definir roles iniciales tolerando rolesIniciales o role
    const rolesIniciales = dto.role || dto.role || [UserRole.ESTUDIANTE];

    // Si el email llega vacío, generar un correo ficticio único basado en documento
    const emailEsFicticio = !dto.email || !dto.email.trim();
    const emailFinal = emailEsFicticio
      ? `${dto.documento}@sistema.local`
      : dto.email!.trim();

    // Validar duplicados en la base de datos local
    const existe = await this.userRepository.findOne({
      where: [{ documento: dto.documento }, { email: emailFinal }],
    });

    if (existe) {
      throw new ConflictException(
        'Ya existe un usuario registrado con este documento o correo electrónico.',
      );
    }

    // 1. Crear en Supabase Auth Admin
    const { data: authUser, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: emailFinal,
        password: dto.password || dto.documento, // Si no envía contraseña, asigna el documento
        email_confirm: true,
        user_metadata: {
          nombre: dto.nombre,
          apellido: dto.apellido,
          documento: dto.documento,
        },
        app_metadata: {
          roles: rolesIniciales,
        },
      });

    if (authError || !authUser.user) {
      throw new BadRequestException(
        `Error al registrar en Supabase Auth: ${authError?.message}`,
      );
    }

    // 2. Insertar en public.users reutilizando el UUID generado por Supabase Auth
    const nuevoUsuario = this.userRepository.create({
      id: authUser.user.id,
      nombre: dto.nombre,
      segundoNombre: dto.segundoNombre,
      apellido: dto.apellido,
      segundoApellido: dto.segundoApellido,
      email: emailFinal,
      emailFicticio: emailEsFicticio,
      documento: dto.documento,
      tipoIdentificacion: dto.tipoIdentificacion,
      telefono: dto.telefono,
      roles: rolesIniciales as UserRole[],
      activo: true,
    });

    await this.userRepository.save(nuevoUsuario);

    return {
      mensaje: 'Usuario creado exitosamente',
      usuario: nuevoUsuario,
    };
  }

  /**
   * Verificar existencia de usuario por documento antes de matricular o registrar.
   */
  async verificarDocumento(documento: string) {
    const usuario = await this.userRepository.findOne({
      where: { documento },
    });

    if (!usuario) {
      return {
        existe: false,
        mensaje: 'Documento no encontrado. Se debe registrar como nuevo usuario.',
      };
    }

    const camposFaltantes = this.detectarCamposFaltantes(usuario);

    const [perfilExtendido] = await this.dataSource.query(
      `SELECT * FROM perfiles_estudiante WHERE usuario_id = $1`,
      [usuario.id],
    );

    return {
      existe: true,
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.emailFicticio ? null : usuario.email,
      emailFicticio: usuario.emailFicticio,
      documento: usuario.documento,
      tipoIdentificacion: usuario.tipoIdentificacion,
      fechaNacimiento: usuario.fechaNacimiento,
      telefono: usuario.telefono,
      roles: usuario.roles,
      activo: usuario.activo,
      perfil: perfilExtendido ?? null,
      camposFaltantes,
      perfilCompleto: camposFaltantes.length === 0,
    };
  }

  // ================================================================
  // 2. ACTUALIZACIÓN DE PERFILES (GENERAL, ESTUDIANTE Y DOCENTE)
  // ================================================================

  /**
   * Actualiza datos generales del usuario y, opcionalmente, la información de acudiente.
   */
  async completarPerfil(usuarioId: string, dto: CompletarPerfilDto) {
    const usuario = await this.userRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // 1. Actualizar entidad principal User
    await this.actualizarDatosGeneralesUser(usuarioId, dto);

    // 2. Si vienen datos de acudiente, upsert en perfiles_estudiante
    if (dto.acudienteNombre || dto.acudienteTelefono || dto.acudienteParentesco) {
      await this.dataSource.query(
        `INSERT INTO perfiles_estudiante (
          usuario_id, acudiente_nombre, acudiente_telefono, acudiente_parentesco, updated_at
        ) VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (usuario_id) DO UPDATE SET
          acudiente_nombre     = COALESCE(EXCLUDED.acudiente_nombre, perfiles_estudiante.acudiente_nombre),
          acudiente_telefono   = COALESCE(EXCLUDED.acudiente_telefono, perfiles_estudiante.acudiente_telefono),
          acudiente_parentesco = COALESCE(EXCLUDED.acudiente_parentesco, perfiles_estudiante.acudiente_parentesco),
          updated_at           = NOW()`,
        [
          usuarioId,
          dto.acudienteNombre ?? null,
          dto.acudienteTelefono ?? null,
          dto.acudienteParentesco ?? null,
        ],
      );
    }

    return { mensaje: 'Perfil general actualizado correctamente' };
  }

  /**
   * Guarda o actualiza los datos del perfil docente.
   */
  async completarPerfilDocente(
    usuarioId: string,
    dto: CompletarPerfilDocenteDto,
  ) {
    const usuario = await this.userRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    await this.dataSource.query(
      `INSERT INTO perfiles_docente (
        usuario_id, especialidad, tipo_vinculacion, tarifa_hora, hoja_vida_url, fecha_vinculacion, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (usuario_id) DO UPDATE SET
        especialidad      = COALESCE(EXCLUDED.especialidad, perfiles_docente.especialidad),
        tipo_vinculacion  = COALESCE(EXCLUDED.tipo_vinculacion, perfiles_docente.tipo_vinculacion),
        tarifa_hora       = COALESCE(EXCLUDED.tarifa_hora, perfiles_docente.tarifa_hora),
        hoja_vida_url     = COALESCE(EXCLUDED.hoja_vida_url, perfiles_docente.hoja_vida_url),
        fecha_vinculacion = COALESCE(EXCLUDED.fecha_vinculacion, perfiles_docente.fecha_vinculacion),
        updated_at        = NOW()`,
      [
        usuarioId,
        dto.especialidad ?? null,
        dto.tipoVinculacion ?? null,
        dto.tarifaHora ?? null,
        dto.hojaVidaUrl ?? null,
        dto.fechaVinculacion ?? null,
      ],
    );

    return { mensaje: 'Perfil docente actualizado correctamente' };
  }

  // ================================================================
  // 3. REGISTROS / INSCRIPCIONES DESDE MÓDULOS ESPECÍFICOS DEL FRONT
  // ================================================================

  /**
   * Inscripción de usuario como estudiante (asigna rol 'estudiante' y actualiza perfil).
   */
  async inscribirComoEstudiante(usuarioId: string, dto: CompletarPerfilDto) {
    const usuario = await this.userRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    await this.asegurarRol(usuario, UserRole.ESTUDIANTE);
    return await this.completarPerfil(usuarioId, dto);
  }

  /**
   * Inscripción de usuario como docente (asigna rol 'docente' y actualiza perfil docente).
   */
  async inscribirComoDocente(
    usuarioId: string,
    dto: CompletarPerfilDocenteDto,
  ) {
    const usuario = await this.userRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    await this.asegurarRol(usuario, UserRole.DOCENTE);
    return await this.completarPerfilDocente(usuarioId, dto);
  }

  // ================================================================
  // 4. MÓDULO ADMINISTRATIVO, FILTROS Y ROLES
  // ================================================================

  /**
   * Asignación manual de roles desde módulo administrativo.
   */
  async actualizarRoles(usuarioId: string, dto: ActualizarRolesDto) {
    const usuario = await this.userRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const rolesUnicos = Array.from(new Set(dto.roles));

    // 1. Guardar en Postgres
    await this.userRepository.update(usuarioId, { roles: rolesUnicos as UserRole[] });

    // 2. Sincronizar en Supabase Auth Admin
    await this.supabase.auth.admin.updateUserById(usuarioId, {
      app_metadata: { roles: rolesUnicos },
    });

    return { mensaje: 'Roles actualizados correctamente', roles: rolesUnicos };
  }

  /**
   * Consulta paginada desde la vista `v_usuarios_completo`.
   */
  async listar(filtros: FiltroUsuariosDto) {
    const pagina = filtros.pagina ?? 1;
    const porPagina = filtros.porPagina ?? 20;
    const desde = (pagina - 1) * porPagina;
    const hasta = desde + porPagina - 1;

    let query = this.supabase
      .from('v_usuarios_completo')
      .select('*', { count: 'exact' });

    if (filtros.nombre) {
      query = query.ilike('nombre_completo', `%${filtros.nombre}%`);
    }

    if (filtros.documento) {
      query = query.eq('documento', filtros.documento);
    }

    if (filtros.rol) {
      query = query.contains('roles', [filtros.rol]);
    }

    if (filtros.activo !== undefined) {
      query = query.eq('activo', filtros.activo);
    }

    const { data, count, error } = await query.range(desde, hasta);

    if (error) throw new BadRequestException(error.message);

    return {
      total: count ?? 0,
      pagina,
      porPagina,
      totalPaginas: Math.ceil((count ?? 0) / porPagina),
      datos: data,
    };
  }

  /**
   * Obtener docentes activos para selectores en matrículas o asignación de clases.
   */
  async obtenerDocentes() {
    return this.userRepository
      .createQueryBuilder('user')
      .where(':rol = ANY(user.roles)', { rol: UserRole.DOCENTE })
      .getMany();
  }

  /**
   * Marcar usuarios inactivos si no tienen inscripciones vigentes.
   */
  async marcarInactivos(): Promise<{ afectados: number; usuarios: any[] }> {
    const sinInscripcion = await this.dataSource.query(
      `SELECT u.id, u.email, u.nombre, u.apellido, u."createdAt"
       FROM public.users u
       LEFT JOIN inscripciones i ON i.usuario_id = u.id AND i.estado = 'activa'
       WHERE i.id IS NULL
         AND u.activo = true
         AND 'estudiante' = ANY(u.roles)
         AND u.id NOT IN (${[...IDS_PROTEGIDOS].map((_, i) => `$${i + 1}`).join(',')})`,
      [...IDS_PROTEGIDOS],
    );

    if (!sinInscripcion.length) {
      return { afectados: 0, usuarios: [] };
    }

    const ids = sinInscripcion.map((u: any) => u.id);

    await this.dataSource.query(
      `UPDATE public.users SET activo = false WHERE id = ANY($1::uuid[])`,
      [ids],
    );

    this.logger.log(`Marcados como inactivos: ${ids.length} usuarios`);

    return {
      afectados: ids.length,
      usuarios: sinInscripcion,
    };
  }

  /**
   * Eliminar usuario (Desactiva y remueve de Auth / DB).
   */
  async eliminar(usuarioId: string): Promise<{ mensaje: string }> {
    if (IDS_PROTEGIDOS.has(usuarioId)) {
      throw new ForbiddenException('Este usuario está protegido y no se puede eliminar.');
    }

    const usuario = await this.userRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    if (usuario.activo) {
      throw new BadRequestException(
        'El usuario debe estar inactivo antes de ser eliminado. Usa marcar-inactivos primero.',
      );
    }

    const { error } = await this.supabase.auth.admin.deleteUser(usuarioId);
    if (error) {
      throw new BadRequestException('Error eliminando usuario en Supabase Auth: ' + error.message);
    }

    return { mensaje: `Usuario ${usuario.email} eliminado correctamente.` };
  }

  // ================================================================
  // HELPER MÉTODOS PRIVADOS
  // ================================================================

  /**
   * Agrega un nuevo rol al arreglo de roles sin duplicados y lo sincroniza en Supabase Auth.
   */
  private async asegurarRol(usuario: User, nuevoRol: string) {
    const rolesActuales = (usuario.roles as string[]) || [];

    if (!rolesActuales.includes(nuevoRol)) {
      const rolesActualizados = [...rolesActuales, nuevoRol];

      // 1. Guardar en Base de Datos PostgreSQL
      await this.userRepository.update(usuario.id, {
        roles: rolesActualizados as UserRole[],
      });

      // 2. Actualizar metadatos en Supabase Auth Admin
      await this.supabase.auth.admin.updateUserById(usuario.id, {
        app_metadata: { roles: rolesActualizados },
      });
    }
  }

  /**
   * Mapeo y actualización dinámica de los campos personales en public.users.
   */
  private async actualizarDatosGeneralesUser(
    usuarioId: string,
    dto: CompletarPerfilDto,
  ) {
    await this.userRepository.update(usuarioId, {
      ...(dto.nombre && { nombre: dto.nombre }),
      ...(dto.apellido && { apellido: dto.apellido }),
      ...(dto.telefono && { telefono: dto.telefono }),
      ...(dto.fechaNacimiento && { fechaNacimiento: new Date(dto.fechaNacimiento) }),
      ...(dto.tipoIdentificacion && { tipoIdentificacion: dto.tipoIdentificacion }),
      ...(dto.segundoNombre && { segundoNombre: dto.segundoNombre }),
      ...(dto.segundoApellido && { segundoApellido: dto.segundoApellido }),
      ...(dto.genero && { genero: dto.genero }),
      ...(dto.direccion && { direccion: dto.direccion }),
      ...(dto.barrio && { barrio: dto.barrio }),
      ...(dto.municipio && { municipio: dto.municipio }),
      ...(dto.departamento && { departamento: dto.departamento }),
      ...(dto.pais && { pais: dto.pais }),
      ...(dto.municipioNacimiento && { municipioNacimiento: dto.municipioNacimiento }),
      ...(dto.departamentoNacimiento && { departamentoNacimiento: dto.departamentoNacimiento }),
      ...(dto.paisNacimiento && { paisNacimiento: dto.paisNacimiento }),
      ...(dto.zonaResidencia && { zonaResidencia: dto.zonaResidencia }),
      ...(dto.enfoquePoblacional && { enfoquePoblacional: dto.enfoquePoblacional }),
      ...(dto.tieneDiscapacidad !== undefined && { tieneDiscapacidad: dto.tieneDiscapacidad }),
      ...(dto.tipoDiscapacidad && { tipoDiscapacidad: dto.tipoDiscapacidad }),
      ...(dto.estrato !== undefined && { estrato: dto.estrato }),
      ...(dto.eps && { eps: dto.eps }),
    });
  }

  /**
   * Evalúa qué atributos básicos faltan por completar.
   */
  private detectarCamposFaltantes(usuario: User): string[] {
    const faltantes: string[] = [];
    if (!usuario.nombre) faltantes.push('nombre');
    if (!usuario.apellido) faltantes.push('apellido');
    if (!usuario.telefono) faltantes.push('telefono');
    if (!usuario.fechaNacimiento) faltantes.push('fechaNacimiento');
    if (!usuario.documento) faltantes.push('documento');
    return faltantes;
  }
}