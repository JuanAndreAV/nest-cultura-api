import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserRole } from '../auth/entities/user.entity';
import { CompletarPerfilDto } from './dto/completar-perfil.dto';
import { FiltroUsuariosDto } from './dto/filtro-usuarios.dto';
import { CompletarPerfilDocenteDto } from './dto/completa-perfil-docente.dto';
import { ActualizarRolesDto } from './dto/actualizar-roles.dto';

// IDs protegidos — nunca se tocan
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

  // ----------------------------------------------------------------
  // VERIFICAR POR DOCUMENTO
  // Busca si el usuario existe antes de inscribirse
  // ----------------------------------------------------------------
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

    // Verificar campos faltantes para saber qué debe completar
    const camposFaltantes = this.detectarCamposFaltantes(usuario);

    // Traer perfil extendido
    const [perfilExtendido] = await this.dataSource.query(
      `SELECT * FROM perfiles_estudiante WHERE usuario_id = $1`,
      [usuario.id],
    );

    return {
      existe:          true,
      id:              usuario.id,
      nombre:          usuario.nombre,
      apellido:        usuario.apellido,
      email:           usuario.emailFicticio ? null : usuario.email,
      emailFicticio:   usuario.emailFicticio,
      documento:       usuario.documento,
      fechaNacimiento: usuario.fechaNacimiento,
      telefono:        usuario.telefono,
      activo:          usuario.activo,
      perfil:          perfilExtendido ?? null,
      camposFaltantes,
      perfilCompleto:  camposFaltantes.length === 0,
    };
  }

  // ----------------------------------------------------------------
  // COMPLETAR PERFIL
  // Actualiza datos faltantes antes de formalizar inscripción
  // ----------------------------------------------------------------
 // usuarios.service.ts — reemplaza el método completarPerfil existente
async completarPerfil(usuarioId: string, dto: CompletarPerfilDto) {
    const usuario = await this.userRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // 1. Actualizar datos comunes en la entidad User
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

    // 2. Si vienen datos de acudiente, actualizamos perfiles_estudiante
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
        [usuarioId, dto.acudienteNombre ?? null, dto.acudienteTelefono ?? null, dto.acudienteParentesco ?? null],
      );
    }

    return { mensaje: 'Perfil general actualizado correctamente' };
  };

  async completarPerfilDocente(usuarioId: string, dto: CompletarPerfilDocenteDto) {
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



  // ----------------------------------------------------------------
  // LISTAR USUARIOS CON FILTROS
  // Para el panel de admin
  // ----------------------------------------------------------------
  async listar(filtros: FiltroUsuariosDto) {
    const { data, error } = await this.supabase
      .from('v_usuarios_completo')
      .select('*');

    if (error) throw new BadRequestException(error.message);

    let resultado = data;

    // Filtros en memoria (para no complicar la query de la vista)
    if (filtros.nombre) {
      const termino = filtros.nombre.toLowerCase();
      resultado = resultado.filter(u =>
        u.nombre_completo?.toLowerCase().includes(termino),
      );
    }

    if (filtros.documento) {
      resultado = resultado.filter(u =>
        u.documento?.includes(filtros.documento!),
      );
    }

    if (filtros.rol) {
      resultado = resultado.filter(u =>
        u.roles?.includes(filtros.rol),
      );
    }

    if (filtros.activo !== undefined) {
      resultado = resultado.filter(u => u.activo === filtros.activo);
    }

    if (filtros.soloSinInscripcion) {
      const sinInscripcion = await this.dataSource.query(
        `SELECT u.id FROM public.users u
         LEFT JOIN inscripciones i ON i.usuario_id = u.id AND i.estado = 'activa'
         WHERE i.id IS NULL AND u.activo = true`,
      );
      const ids = new Set(sinInscripcion.map((r: any) => r.id));
      resultado = resultado.filter(u => ids.has(u.id));
    }

    // Paginación
    const pagina    = filtros.pagina ?? 1;
    const porPagina = filtros.porPagina ?? 20;
    const total     = resultado.length;
    const paginado  = resultado.slice((pagina - 1) * porPagina, pagina * porPagina);

    return {
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
      datos: paginado,
    };
  }

  // ----------------------------------------------------------------
  // MARCAR INACTIVOS
  // Usuarios migrados de Q10 sin ninguna inscripción activa
  // Solo admin puede ejecutar esto
  // ----------------------------------------------------------------
  async marcarInactivos(): Promise<{ afectados: number; usuarios: any[] }> {
    const sinInscripcion = await this.dataSource.query(
      `SELECT u.id, u.email, u.nombre, u.apellido, u."createdAt"
       FROM public.users u
       LEFT JOIN inscripciones i ON i.usuario_id = u.id AND i.estado = 'activa'
       LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
       WHERE i.id IS NULL
         AND u.activo = true
         AND ur.role = 'estudiante'
         AND u.id NOT IN (${[...IDS_PROTEGIDOS].map((_, i) => `$${i + 1}`).join(',')})`,
      [...IDS_PROTEGIDOS],
    );

    if (!sinInscripcion.length) {
      return { afectados: 0, usuarios: [] };
    }

    const ids = sinInscripcion.map((u: any) => u.id);

    await this.dataSource.query(
      `UPDATE public.users SET activo = false
       WHERE id = ANY($1::uuid[])`,
      [ids],
    );

    this.logger.log(`Marcados como inactivos: ${ids.length} usuarios`);

    return {
      afectados: ids.length,
      usuarios:  sinInscripcion,
    };
  }

  // ----------------------------------------------------------------
  // ELIMINAR USUARIO (con autorización)
  // Solo admin, nunca los protegidos
  // ----------------------------------------------------------------
  async eliminar(usuarioId: string): Promise<{ mensaje: string }> {
    if (IDS_PROTEGIDOS.has(usuarioId)) {
      throw new ForbiddenException('Este usuario no puede ser eliminado.');
    }

    const usuario = await this.userRepository.findOne({
      where: { id: usuarioId },
    });

    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    if (usuario.activo) {
      throw new BadRequestException(
        'El usuario debe estar inactivo antes de eliminarlo. Usa marcar-inactivos primero.',
      );
    }

    // Eliminar de Supabase Auth (cascada elimina public.users por FK)
    const { error } = await this.supabase.auth.admin.deleteUser(usuarioId);
    if (error) throw new BadRequestException('Error eliminando usuario: ' + error.message);

    return { mensaje: `Usuario ${usuario.email} eliminado correctamente.` };
  }

  // ----------------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------------
  private detectarCamposFaltantes(usuario: User): string[] {
    const faltantes: string[] = [];
    if (!usuario.nombre)          faltantes.push('nombre');
    if (!usuario.apellido)        faltantes.push('apellido');
    if (!usuario.telefono)        faltantes.push('telefono');
    if (!usuario.fechaNacimiento) faltantes.push('fechaNacimiento');
    if (!usuario.documento)       faltantes.push('documento');
    return faltantes;
  }

  //Actualizar roles
  async actualizarRoles(usuarioId: string, dto: ActualizarRolesDto) {
  const usuario = await this.userRepository.findOne({ where: { id: usuarioId } });
  if (!usuario) throw new NotFoundException('Usuario no encontrado');

  // Asegurar elementos únicos en el arreglo
  const rolesUnicos = Array.from(new Set(dto.roles));

  await this.userRepository.update(usuarioId, {
    roles: rolesUnicos,
  });

  return { mensaje: 'Roles actualizados correctamente', roles: rolesUnicos };
}
async obtenerDocentes() {
  return this.userRepository
    .createQueryBuilder('user')
    .where(':rol = ANY(user.roles)', { rol: UserRole.DOCENTE })
    .getMany();
}
}