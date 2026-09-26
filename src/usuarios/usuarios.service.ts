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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // Forzamos al cliente de Supabase a usar de manera aislada la clave de Service Role
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      },
    );
  }

  // ================================================================
  // 1. CREACIÓN Y VERIFICACIÓN BASE DE USUARIOS
  // ================================================================

  /**
   * Crear un nuevo usuario en Supabase Auth y sincronizar en public.users
   */
  async crear(dto: CrearUsuarioDto) {
    // 1. Determinar roles que vienen en la petición actual
    const nuevosRoles = dto.roles?.length
      ? dto.roles
      : dto.role?.length
      ? dto.role
      : dto.rolesIniciales?.length
      ? dto.rolesIniciales
      : [UserRole.ESTUDIANTE];

    // Email ficticio si no viene
    const emailEsFicticio = !dto.email || !dto.email.trim();
    const emailFinal = emailEsFicticio
      ? `${dto.documento}@sistema.local`
      : dto.email!.trim();

    // 2. Verificar si el usuario ya existe en la BD por documento o email
    const usuarioExistente = await this.userRepository.findOne({
      where: [{ documento: dto.documento }, { email: emailFinal }],
    });

    if (usuarioExistente) {
      throw new ConflictException(
        'Ya existe un usuario registrado con este documento o correo electrónico.',
      );
    }

    // 3. Crear en Supabase Auth Admin
    const { data: authUser, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: emailFinal,
        password: dto.password || dto.documento,
        email_confirm: true,
        user_metadata: {
          nombre:    dto.nombre,
          apellido:  dto.apellido,
          documento: dto.documento,
        },
        app_metadata: { roles: nuevosRoles },
      });

    if (authError || !authUser.user) {
      throw new BadRequestException(
        `Error al registrar en Supabase Auth: ${authError?.message}`,
      );
    }

    const userId = authUser.user.id;

    // Pequeña espera por si hay un trigger en PostgreSQL/Supabase
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 4. Consultar si el trigger de Supabase o un registro previo ya insertó en public.users
    const usuarioDB = await this.userRepository.findOne({
      where: { id: userId },
    });

    // 5. UNIFICAR ROLES: Combinar los roles existentes en BD con los nuevos recibidos
    const rolesPrevios = usuarioDB?.roles || [];
    const rolesDefinitivos = Array.from(
      new Set([...rolesPrevios, ...nuevosRoles]),
    ) as UserRole[];

    const datosBase = {
      nombre:             dto.nombre,
      segundoNombre:      dto.segundoNombre      ?? null,
      apellido:           dto.apellido,
      segundoApellido:    dto.segundoApellido    ?? null,
      email:              emailFinal,
      emailFicticio:      emailEsFicticio,
      documento:          dto.documento,
      tipoIdentificacion: dto.tipoIdentificacion ?? null,
      telefono:           dto.telefono           ?? null,
      genero:             dto.genero             ?? null,
      fechaNacimiento:    dto.fechaNacimiento
        ? (dto.fechaNacimiento.split('T')[0] as any)
        : null,
      roles:  rolesDefinitivos,
      activo: true,
    };

    if (usuarioDB) {
      await this.userRepository.update(userId, datosBase);
    } else {
      const nuevoUsuario = this.userRepository.create({
        id: userId,
        ...datosBase,
      });
      await this.userRepository.save(nuevoUsuario);
    }

    // Sincronizar roles unificados en app_metadata de Supabase Auth
    await this.supabase.auth.admin.updateUserById(userId, {
      app_metadata: { roles: rolesDefinitivos },
    });

    // 6. Actualizar caracterización, ubicación Y ROLES UNIFICADOS en PostgreSQL
    await this.dataSource.query(
      `UPDATE public.users SET
        direccion               = $2,
        barrio                  = $3,
        municipio               = $4,
        departamento            = $5,
        pais                    = COALESCE($6, 'Colombia'),
        municipio_nacimiento    = $7,
        departamento_nacimiento = $8,
        pais_nacimiento         = $9,
        zona_residencia         = $10,
        enfoque_poblacional     = $11,
        tiene_discapacidad      = COALESCE($12, false),
        tipo_discapacidad       = $13,
        estrato                 = $14,
        eps                     = $15,
        roles                   = $16,
        "updatedAt"             = NOW()
      WHERE id = $1`,
      [
        userId,
        dto.direccion              ?? null,
        dto.barrio                 ?? null,
        dto.municipio              ?? null,
        dto.departamento           ?? null,
        dto.pais                   ?? null,
        dto.municipioNacimiento    ?? null,
        dto.departamentoNacimiento ?? null,
        dto.paisNacimiento         ?? null,
        dto.zonaResidencia         ?? null,
        dto.enfoquePoblacional     ?? null,
        dto.tieneDiscapacidad      ?? null,
        dto.tipoDiscapacidad       ?? null,
        dto.estrato                ?? null,
        dto.eps                    ?? null,
        rolesDefinitivos,
      ],
    );

    // 7. Datos de acudiente si aplica
    if (dto.acudienteNombre) {
      await this.dataSource.query(
        `INSERT INTO perfiles_estudiante (
          usuario_id, acudiente_nombre, acudiente_telefono, acudiente_parentesco
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (usuario_id) DO UPDATE SET
          acudiente_nombre     = EXCLUDED.acudiente_nombre,
          acudiente_telefono   = EXCLUDED.acudiente_telefono,
          acudiente_parentesco = EXCLUDED.acudiente_parentesco`,
        [
          userId,
          dto.acudienteNombre,
          dto.acudienteTelefono   ?? null,
          dto.acudienteParentesco ?? null,
        ],
      );
    }

    // 8. Retornar usuario con la lista acumulada de roles
    const usuarioCompleto = await this.userRepository.findOne({
      where: { id: userId },
    });

    return {
      mensaje: 'Usuario creado exitosamente',
      usuario: usuarioCompleto,
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
      segundoNombre: usuario.segundoNombre,
      apellido: usuario.apellido,
      segundoApellido: usuario.segundoApellido,
      email: usuario.emailFicticio ? null : usuario.email,
      emailFicticio: usuario.emailFicticio,
      documento: usuario.documento,
      tipoIdentificacion: usuario.tipoIdentificacion,
      fechaNacimiento: usuario.fechaNacimiento
        ? String(usuario.fechaNacimiento).split('T')[0]
        : null,
      telefono: usuario.telefono,

      direccion: usuario.direccion,
      barrio: usuario.barrio,
      pais: usuario.pais,
      departamento: usuario.departamento,
      municipio: usuario.municipio,
      departamentoNacimiento: usuario.departamentoNacimiento,
      municipioNacimiento: usuario.municipioNacimiento,
      paisNacimiento: usuario.paisNacimiento,
      enfoquePoblacional: usuario.enfoquePoblacional,
      eps: usuario.eps,
      estrato: usuario.estrato,
      genero: usuario.genero,
      zonaResidencia: usuario.zonaResidencia,
      tieneDiscapacidad: usuario.tieneDiscapacidad,
      tipoDiscapacidad: usuario.tipoDiscapacidad,

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
  // usuarios.service.ts — reemplaza completarPerfil() completo
async completarPerfil(usuarioId: string, dto: CompletarPerfilDto) {
  const usuario = await this.userRepository.findOne({ where: { id: usuarioId } });
  if (!usuario) throw new NotFoundException('Usuario no encontrado');

  // Todo el perfil editable vive en public.users, igual que en crear()
  await this.dataSource.query(
    `UPDATE public.users SET
      nombre                  = COALESCE($2, nombre),
      segundo_nombre          = COALESCE($3, segundo_nombre),
      apellido                = COALESCE($4, apellido),
      segundo_apellido        = COALESCE($5, segundo_apellido),
      tipo_identificacion     = COALESCE($6, tipo_identificacion),
      telefono                = COALESCE($7, telefono),
      genero                  = COALESCE($8, genero),
      fecha_nacimiento        = COALESCE($9, fecha_nacimiento),
      direccion                = COALESCE($10, direccion),
      barrio                   = COALESCE($11, barrio),
      municipio                = COALESCE($12, municipio),
      departamento              = COALESCE($13, departamento),
      pais                      = COALESCE($14, pais),
      municipio_nacimiento     = COALESCE($15, municipio_nacimiento),
      departamento_nacimiento  = COALESCE($16, departamento_nacimiento),
      pais_nacimiento          = COALESCE($17, pais_nacimiento),
      zona_residencia          = COALESCE($18, zona_residencia),
      enfoque_poblacional      = COALESCE($19, enfoque_poblacional),
      tiene_discapacidad       = COALESCE($20, tiene_discapacidad),
      tipo_discapacidad        = COALESCE($21, tipo_discapacidad),
      estrato                  = COALESCE($22, estrato),
      eps                      = COALESCE($23, eps),
      "updatedAt"              = NOW()
    WHERE id = $1`,
    [
      usuarioId,
      dto.nombre ?? null,
      dto.segundoNombre ?? null,
      dto.apellido ?? null,
      dto.segundoApellido ?? null,
      dto.tipoIdentificacion ?? null,
      dto.telefono ?? null,
      dto.genero ?? null,
      dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : null,
      dto.direccion ?? null,
      dto.barrio ?? null,
      dto.municipio ?? null,
      dto.departamento ?? null,
      dto.pais ?? null,
      dto.municipioNacimiento ?? null,
      dto.departamentoNacimiento ?? null,
      dto.paisNacimiento ?? null,
      dto.zonaResidencia ?? null,
      dto.enfoquePoblacional ?? null,
      dto.tieneDiscapacidad ?? null,
      dto.tipoDiscapacidad ?? null,
      dto.estrato ?? null,
      dto.eps ?? null,
    ],
  );

  // Roles: unión sin duplicados, sin borrar lo que ya tenía
  if (dto.roles?.length) {
    await this.dataSource.query(
      `UPDATE public.users
       SET roles = ARRAY(SELECT DISTINCT unnest(roles || $2::text[]))
       WHERE id = $1`,
      [usuarioId, dto.roles],
    );
  }

  // perfiles_estudiante: solo acudiente (todo lo demás ya no vive aquí)
  if (dto.acudienteNombre || dto.acudienteTelefono || dto.acudienteParentesco) {
    await this.dataSource.query(
      `INSERT INTO perfiles_estudiante (usuario_id, acudiente_nombre, acudiente_telefono, acudiente_parentesco)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id) DO UPDATE SET
         acudiente_nombre     = COALESCE(EXCLUDED.acudiente_nombre, perfiles_estudiante.acudiente_nombre),
         acudiente_telefono   = COALESCE(EXCLUDED.acudiente_telefono, perfiles_estudiante.acudiente_telefono),
         acudiente_parentesco = COALESCE(EXCLUDED.acudiente_parentesco, perfiles_estudiante.acudiente_parentesco)`,
      [usuarioId, dto.acudienteNombre ?? null, dto.acudienteTelefono ?? null, dto.acudienteParentesco ?? null],
    );
  }

  return { mensaje: 'Perfil actualizado correctamente' };
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
  private async asegurarRol(usuario: User, nuevoRol: UserRole) {
    const rolesActuales = (usuario.roles as UserRole[]) || [];

    if (!rolesActuales.includes(nuevoRol)) {
      const rolesActualizados = [...rolesActuales, nuevoRol];

      // 1. Guardar en Base de Datos PostgreSQL
      await this.userRepository.update(usuario.id, {
        roles: rolesActualizados,
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
    // Extracción plana de fecha YYYY-MM-DD sin new Date() para evitar desfase UTC-5
    const fechaLimpia = dto.fechaNacimiento
      ? dto.fechaNacimiento.split('T')[0]
      : undefined;

    await this.userRepository.update(usuarioId, {
      ...(dto.nombre && { nombre: dto.nombre }),
      ...(dto.apellido && { apellido: dto.apellido }),
      ...(dto.telefono && { telefono: dto.telefono }),
      ...(fechaLimpia && { fechaNacimiento: fechaLimpia as any }),
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
    if (!usuario.enfoquePoblacional) faltantes.push('enfoquePoblacional');
    if (!usuario.zonaResidencia) faltantes.push('zonaResidencia');
    if (!usuario.genero) faltantes.push('genero');
    if (!usuario.estrato) faltantes.push('estrato');
    if (!usuario.eps) faltantes.push('eps');

    return faltantes;
  }
}