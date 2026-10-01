import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asistencia } from './entities/asistencia.entity';
import { Inscripcion } from '../inscripciones/entities/inscripcione.entity';
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
  // VALIDACIÓN DE PROPIEDAD — reutilizada en todos los métodos
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

  // ----------------------------------------------------------------
  // REGISTRAR UNA ASISTENCIA
  // ----------------------------------------------------------------
  async registrar(dto: CreateAsistenciaDto, usuario: any): Promise<Asistencia> {
    const inscripcion = await this.obtenerInscripcionConCurso(dto.inscripcionId);

    if (!usuario.es_admin && inscripcion.curso.docenteId !== usuario.id) {
      throw new ForbiddenException('Solo puedes registrar asistencia de tus propios cursos.');
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

    const asistencia = this.asistenciaRepository.create({
      inscripcionId: dto.inscripcionId,
      fecha:         dto.fecha,
      asistio:       dto.asistio,
      observacion:   dto.observacion ?? null,
      registradoPor: usuario.id,
    });

    return this.asistenciaRepository.save(asistencia);
  }

  // ----------------------------------------------------------------
  // REGISTRO MASIVO — todo el curso en una fecha
  // upsert nativo — requiere el @Unique(['inscripcionId', 'fecha'])
  // ----------------------------------------------------------------
  async registrarMasivo(dto: RegistroMasivoDto, usuario: any): Promise<{
    procesadas: number;
  }> {
    await this.validarPropiedadCurso(dto.cursoId, usuario);

    if (!dto.asistencias.length) {
      return { procesadas: 0 };
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
  // LISTAR POR INSCRIPCIÓN — historial de un estudiante en un curso
  // Accesible por: el propio estudiante, el docente del curso, o admin
  // ----------------------------------------------------------------
  async listarPorInscripcion(inscripcionId: string, usuario: any): Promise<Asistencia[]> {
    const inscripcion = await this.obtenerInscripcionConCurso(inscripcionId);

    const esPropia        = inscripcion.usuarioId === usuario.id;
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
  // LISTAR POR CURSO Y FECHA — para pasar lista
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
        'a.id',
        'a.asistio',
        'a.observacion',
        'a.fecha',
        'i.id',
        'u.id',
        'u.nombre',
        'u.apellido',
        'u.documento',
      ])
      .orderBy('u.apellido', 'ASC')
      .getMany();
  }

  // ----------------------------------------------------------------
  // RESUMEN DE ASISTENCIA — para reportes en Angular
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
  // FECHAS CON CLASE — para el calendario del docente
  // ----------------------------------------------------------------
  async fechasRegistradas(cursoId: string, usuario: any): Promise<{ fecha: string; total: number; presentes: number }[]> {
    await this.validarPropiedadCurso(cursoId, usuario);

    return this.asistenciaRepository
      .createQueryBuilder('a')
      .leftJoin('a.inscripcion', 'i')
      .where('i.curso_id = :cursoId', { cursoId })
      .select([
        'a.fecha                                          AS fecha',
        'COUNT(a.id)                                     AS total',
        'SUM(CASE WHEN a.asistio THEN 1 ELSE 0 END)     AS presentes',
      ])
      .groupBy('a.fecha')
      .orderBy('a.fecha', 'DESC')
      .getRawMany();
  }
// ----------------------------------------------------------------
// RESUMEN POR INSCRIPCIÓN — usa la vista v_asistencia_resumen
// Accesible por: el propio estudiante, el docente del curso, o admin
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