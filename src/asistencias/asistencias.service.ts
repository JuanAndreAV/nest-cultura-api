import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asistencia } from './entities/asistencia.entity';
import {
  CreateAsistenciaDto, RegistroMasivoDto,
} from './dto/create-asistencia.dto';

@Injectable()
export class AsistenciasService {
  constructor(
    @InjectRepository(Asistencia)
    private readonly asistenciaRepository: Repository<Asistencia>,
  ) {}

  // ----------------------------------------------------------------
  // REGISTRAR UNA ASISTENCIA
  // ----------------------------------------------------------------
  async registrar(dto: CreateAsistenciaDto, registradoPor: string): Promise<Asistencia> {
    // Verificar si ya existe asistencia para esa inscripción en esa fecha
    const existe = await this.asistenciaRepository.findOne({
      where: {
        inscripcionId: dto.inscripcionId,
        fecha:         new Date(dto.fecha) as any,
      },
    });

    if (existe) {
      // Actualizar en lugar de crear
      existe.asistio      = dto.asistio;
      existe.observacion  = dto.observacion ?? existe.observacion;
      existe.registradoPor = registradoPor;
      return this.asistenciaRepository.save(existe);
    }

    const asistencia = this.asistenciaRepository.create({
      inscripcionId: dto.inscripcionId,
      fecha:         new Date(dto.fecha) as any,
      asistio:       dto.asistio,
      observacion:   dto.observacion ?? null,
      registradoPor,
    });

    return this.asistenciaRepository.save(asistencia);
  }

  // ----------------------------------------------------------------
  // REGISTRO MASIVO — todo el curso en una fecha
  // El docente pasa lista de todos los estudiantes a la vez
  // ----------------------------------------------------------------
  async registrarMasivo(dto: RegistroMasivoDto, registradoPor: string): Promise<{
    registradas: number;
    actualizadas: number;
  }> {
    let registradas  = 0;
    let actualizadas = 0;

    for (const item of dto.asistencias) {
      const existe = await this.asistenciaRepository.findOne({
        where: {
          inscripcionId: item.inscripcionId,
          fecha:         new Date(dto.fecha) as any,
        },
      });

      if (existe) {
        existe.asistio       = item.asistio;
        existe.observacion   = item.observacion ?? existe.observacion;
        existe.registradoPor = registradoPor;
        await this.asistenciaRepository.save(existe);
        actualizadas++;
      } else {
        const asistencia = this.asistenciaRepository.create({
          inscripcionId: item.inscripcionId,
          fecha:         new Date(dto.fecha) as any,
          asistio:       item.asistio,
          observacion:   item.observacion ?? null,
          registradoPor,
        });
        await this.asistenciaRepository.save(asistencia);
        registradas++;
      }
    }

    return { registradas, actualizadas };
  }

  // ----------------------------------------------------------------
  // LISTAR POR INSCRIPCIÓN — historial de un estudiante en un curso
  // ----------------------------------------------------------------
  async listarPorInscripcion(inscripcionId: string): Promise<Asistencia[]> {
    return this.asistenciaRepository.find({
      where: { inscripcionId },
      order: { fecha: 'DESC' },
    });
  }

  // ----------------------------------------------------------------
  // LISTAR POR CURSO Y FECHA — para pasar lista
  // ----------------------------------------------------------------
  async listarPorCursoYFecha(cursoId: string, fecha: string): Promise<any[]> {
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
  // Usa la vista v_asistencia_resumen
  // ----------------------------------------------------------------
  async resumenPorCurso(cursoId: string): Promise<any[]> {
    return this.asistenciaRepository
      .createQueryBuilder('a')
      .leftJoin('a.inscripcion', 'i')
      .leftJoin('i.usuario', 'u')
      .where('i.curso_id = :cursoId', { cursoId })
      .andWhere('i.estado = :estado', { estado: 'activa' })
      .select([
        'u.id                                                AS usuario_id',
        'u.nombre                                           AS nombre',
        'u.apellido                                         AS apellido',
        'COUNT(a.id)                                        AS total_clases',
        'SUM(CASE WHEN a.asistio THEN 1 ELSE 0 END)        AS clases_asistidas',
        `ROUND(
          SUM(CASE WHEN a.asistio THEN 1 ELSE 0 END)
          * 100.0 / NULLIF(COUNT(a.id), 0), 1
        )                                                   AS porcentaje`,
      ])
      .groupBy('u.id, u.nombre, u.apellido')
      .orderBy('u.apellido', 'ASC')
      .getRawMany();
  }

  // ----------------------------------------------------------------
  // FECHAS CON CLASE — para el calendario del docente
  // ----------------------------------------------------------------
  async fechasRegistradas(cursoId: string): Promise<{ fecha: string; total: number; presentes: number }[]> {
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
}