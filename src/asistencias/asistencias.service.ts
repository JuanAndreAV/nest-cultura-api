import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asistencia } from './entities/asistencia.entity';
import { Inscripcion, EstadoInscripcion } from '../inscripciones/entities/inscripcione.entity';
import { CreateAsistenciaDto, RegistroMasivoDto } from './dto/create-asistencia.dto';
import { CursosService } from '../cursos/cursos.service';

@Injectable()
export class AsistenciasService {
  constructor(
    @InjectRepository(Asistencia)
    private readonly asistenciaRepository: Repository<Asistencia>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionRepository: Repository<Inscripcion>,
    private readonly cursosService: CursosService,
  ) {}

  // ----------------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------------
  private async validarPropiedadCurso(cursoId: string, usuario: any): Promise<void> {
    if (usuario.es_admin) return;

    const curso = await this.cursosService.ver(cursoId);
    if (curso.docenteId !== usuario.id) {
      throw new ForbiddenException('Solo puedes gestionar asistencia de tus propios cursos.');
    }
  }

  private async obtenerInscripcionConCurso(inscripcionId: string): Promise<Inscripcion> {
    const inscripcion = await this.inscripcionRepository.findOne({
      where: { id: inscripcionId },
      relations: ['curso'],
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');
    return inscripcion;
  }

  // NUEVO: fecha de hoy en Colombia, sin depender de la zona del servidor
  private hoyBogota(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  }

  // NUEVO: formato válido y no futura
  private validarFecha(fecha: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '')) {
      throw new BadRequestException('Fecha inválida (use YYYY-MM-DD).');
    }
    if (fecha > this.hoyBogota()) {
      throw new BadRequestException('No se puede tomar asistencia de una fecha futura.');
    }
  }

  // ----------------------------------------------------------------
  // LISTA PARA PASAR ASISTENCIA — NUEVO
  // Todos los inscritos activos del curso, con su marca de esa fecha
  // (asistio = null si aún no se ha pasado lista)
  // ----------------------------------------------------------------
  async listaParaAsistencia(cursoId: string, fecha: string, usuario: any) {
    await this.validarPropiedadCurso(cursoId, usuario);
    this.validarFecha(fecha);

    return this.inscripcionRepository
      .createQueryBuilder('i')
      .innerJoin('i.usuario', 'u')
      .leftJoin(Asistencia, 'a', 'a.inscripcion_id = i.id AND a.fecha = :fecha', { fecha })
      .where('i.curso_id = :cursoId', { cursoId })
      .andWhere('i.estado = :estado', { estado: EstadoInscripcion.ACTIVA })
      .select([
        'i.id            AS "inscripcionId"',
        'i.observaciones AS "observacionInscripcion"',
        'u.nombre        AS "nombre"',
        'u.apellido      AS "apellido"',
        'u.documento     AS "documento"',
        'a.asistio       AS "asistio"',
        'a.observacion   AS "observacion"',
      ])
      .orderBy('u.apellido', 'ASC')
      .addOrderBy('u.nombre', 'ASC')
      .getRawMany();
  }

  // ----------------------------------------------------------------
  // REGISTRAR UNA ASISTENCIA
  // ----------------------------------------------------------------
  async registrar(dto: CreateAsistenciaDto, usuario: any): Promise<Asistencia> {
    this.validarFecha(dto.fecha); // NUEVO

    const inscripcion = await this.obtenerInscripcionConCurso(dto.inscripcionId);

    if (!usuario.es_admin && inscripcion.curso.docenteId !== usuario.id) {
      throw new ForbiddenException('Solo puedes registrar asistencia de tus propios cursos.');
    }
    // NUEVO: solo inscripciones activas
    if (inscripcion.estado !== EstadoInscripcion.ACTIVA) {
      throw new BadRequestException('La inscripción no está activa.');
    }

    const existe = await this.asistenciaRepository.findOne({
      where: { inscripcionId: dto.inscripcionId, fecha: dto.fecha },
    });

    if (existe) {
      existe.asistio       = dto.asistio;
      existe.observacion   = dto.observacion ?? existe.observacion;
      existe.registradoPor = usuario.id;
      return this.asistenciaRepository.save(existe);
    }

    return this.asistenciaRepository.save(
      this.asistenciaRepository.create({
        inscripcionId: dto.inscripcionId,
        fecha:         dto.fecha,
        asistio:       dto.asistio,
        observacion:   dto.observacion ?? null,
        registradoPor: usuario.id,
      }),
    );
  }

  // ----------------------------------------------------------------
  // REGISTRO MASIVO — todo el curso en una fecha
  // Requiere índice único (inscripcion_id, fecha) en la BD
  // ----------------------------------------------------------------
  async registrarMasivo(dto: RegistroMasivoDto, usuario: any): Promise<{ procesadas: number }> {
    await this.validarPropiedadCurso(dto.cursoId, usuario);
    this.validarFecha(dto.fecha); // NUEVO

    if (!dto.asistencias.length) return { procesadas: 0 };

    // NUEVO: todas las inscripciones deben ser activas y de ESTE curso
    const validas = await this.inscripcionRepository.find({
      where: { cursoId: dto.cursoId, estado: EstadoInscripcion.ACTIVA },
      select: ['id'],
    });
    const ids = new Set(validas.map(i => i.id));
    if (dto.asistencias.some(a => !ids.has(a.inscripcionId))) {
      throw new BadRequestException(
        'Hay inscripciones que no pertenecen a este curso o no están activas.',
      );
    }

    await this.asistenciaRepository.upsert(
      dto.asistencias.map(item => ({
        inscripcionId: item.inscripcionId,
        fecha:         dto.fecha,
        asistio:       item.asistio,
        observacion:   item.observacion ?? null,
        registradoPor: usuario.id,
      })),
      ['inscripcionId', 'fecha'],
    );

    return { procesadas: dto.asistencias.length };
  }

  // ----------------------------------------------------------------
  // HISTORIAL DE UNA INSCRIPCIÓN
  // Accesible por: el propio estudiante, el docente del curso, o admin
  // ----------------------------------------------------------------
  async listarPorInscripcion(inscripcionId: string, usuario: any): Promise<Asistencia[]> {
    const inscripcion = await this.obtenerInscripcionConCurso(inscripcionId);

    const esPropia         = inscripcion.usuarioId === usuario.id;
    const esDocenteDeCurso = inscripcion.curso.docenteId === usuario.id;

    if (!usuario.es_admin && !esPropia && !esDocenteDeCurso) {
      throw new ForbiddenException('No puedes ver la asistencia de otro estudiante.');
    }

    return this.asistenciaRepository.find({
      where: { inscripcionId },
      order: { fecha: 'DESC' },
    });
  }

  // ----------------------------------------------------------------
  // LISTAR POR CURSO Y FECHA — solo lo ya marcado
  // ----------------------------------------------------------------
  async listarPorCursoYFecha(cursoId: string, fecha: string, usuario: any): Promise<any[]> {
    await this.validarPropiedadCurso(cursoId, usuario);

    return this.asistenciaRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.inscripcion', 'i')
      .leftJoinAndSelect('i.usuario', 'u')
      .where('i.curso_id = :cursoId', { cursoId })
      .andWhere('a.fecha = :fecha', { fecha })
      .andWhere('i.estado = :estado', { estado: 'activa' })
      .select([
        'a.id', 'a.asistio', 'a.observacion', 'a.fecha',
        'i.id',
        'u.id', 'u.nombre', 'u.apellido', 'u.documento',
      ])
      .orderBy('u.apellido', 'ASC')
      .getMany();
  }

  // ----------------------------------------------------------------
  // RESUMEN POR CURSO — vista v_asistencia_resumen
  // ----------------------------------------------------------------
  async resumenPorCurso(cursoId: string, usuario: any): Promise<any[]> {
    await this.validarPropiedadCurso(cursoId, usuario);

    return this.asistenciaRepository.manager.query(
      `SELECT * FROM v_asistencia_resumen
       WHERE curso_id = $1 AND estado_inscripcion = 'activa'
       ORDER BY curso ASC`,
      [cursoId],
    );
  }

  // ----------------------------------------------------------------
  // FECHAS CON ASISTENCIA REGISTRADA
  // CAMBIO: counts como número (Postgres los devuelve como string)
  // ----------------------------------------------------------------
  async fechasRegistradas(
    cursoId: string, usuario: any,
  ): Promise<{ fecha: string; total: number; presentes: number }[]> {
    await this.validarPropiedadCurso(cursoId, usuario);

    const filas = await this.asistenciaRepository
      .createQueryBuilder('a')
      .innerJoin('a.inscripcion', 'i')
      .where('i.curso_id = :cursoId', { cursoId })
      .select([
        'a.fecha AS "fecha"',
        'COUNT(a.id) AS "total"',
        'SUM(CASE WHEN a.asistio THEN 1 ELSE 0 END) AS "presentes"',
      ])
      .groupBy('a.fecha')
      .orderBy('a.fecha', 'DESC')
      .getRawMany();

    return filas.map(f => ({
      fecha: f.fecha,
      total: Number(f.total),
      presentes: Number(f.presentes),
    }));
  }

  // ----------------------------------------------------------------
  // RESUMEN POR INSCRIPCIÓN
  // ----------------------------------------------------------------
  async resumenPorInscripcion(inscripcionId: string, usuario: any): Promise<any> {
    const inscripcion = await this.obtenerInscripcionConCurso(inscripcionId);

    const esPropia         = inscripcion.usuarioId === usuario.id;
    const esDocenteDeCurso = inscripcion.curso.docenteId === usuario.id;

    if (!usuario.es_admin && !esPropia && !esDocenteDeCurso) {
      throw new ForbiddenException('No puedes ver la asistencia de otro estudiante.');
    }

    const [resumen] = await this.asistenciaRepository.manager.query(
      `SELECT * FROM v_asistencia_resumen WHERE inscripcion_id = $1`,
      [inscripcionId],
    );
    if (!resumen) throw new NotFoundException('No hay resumen de asistencia para esta inscripción');
    return resumen;
  }
}