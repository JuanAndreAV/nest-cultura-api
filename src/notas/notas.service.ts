import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nota } from './entities/nota.entity';
import { CreateNotaDto, UpdateNotaDto } from './dto/create-nota.dto';

@Injectable()
export class NotasService {
  constructor(
    @InjectRepository(Nota)
    private readonly notaRepository: Repository<Nota>,
  ) {}

  // ----------------------------------------------------------------
  // CREAR NOTA
  // ----------------------------------------------------------------
  async crear(dto: CreateNotaDto, registradoPor: string): Promise<Nota> {
    const valorMax = dto.valorMax ?? 5;

    if (dto.valor > valorMax) {
      throw new BadRequestException(
        `El valor ${dto.valor} supera el máximo permitido ${valorMax}.`,
      );
    }

    const nota = this.notaRepository.create({
      inscripcionId:    dto.inscripcionId,
      tipoEvaluacion:   dto.tipoEvaluacion,
      descripcion:      dto.descripcion ?? null,
      valor:            dto.valor,
      valorMax,
      periodoEvaluativo: dto.periodoEvaluativo ?? null,
      fecha:            dto.fecha ? new Date(dto.fecha) as any : undefined,
    });

    return this.notaRepository.save(nota);
  }

  // ----------------------------------------------------------------
  // ACTUALIZAR NOTA
  // ----------------------------------------------------------------
  async actualizar(id: string, dto: UpdateNotaDto): Promise<Nota> {
    const nota = await this.notaRepository.findOne({ where: { id } });
    if (!nota) throw new NotFoundException('Nota no encontrada');

    if (dto.valor !== undefined && dto.valor > nota.valorMax) {
      throw new BadRequestException(
        `El valor ${dto.valor} supera el máximo permitido ${nota.valorMax}.`,
      );
    }

    Object.assign(nota, {
      ...(dto.valor             !== undefined && { valor: dto.valor }),
      ...(dto.descripcion       && { descripcion: dto.descripcion }),
      ...(dto.periodoEvaluativo && { periodoEvaluativo: dto.periodoEvaluativo }),
    });

    return this.notaRepository.save(nota);
  }

  // ----------------------------------------------------------------
  // ELIMINAR NOTA
  // ----------------------------------------------------------------
  async eliminar(id: string): Promise<{ mensaje: string }> {
    const nota = await this.notaRepository.findOne({ where: { id } });
    if (!nota) throw new NotFoundException('Nota no encontrada');

    await this.notaRepository.delete(id);
    return { mensaje: 'Nota eliminada correctamente.' };
  }

  // ----------------------------------------------------------------
  // LISTAR POR INSCRIPCIÓN
  // ----------------------------------------------------------------
  async listarPorInscripcion(inscripcionId: string): Promise<Nota[]> {
    return this.notaRepository.find({
      where: { inscripcionId },
      order: { fecha: 'ASC', periodoEvaluativo: 'ASC' },
    });
  }

  // ----------------------------------------------------------------
  // RESUMEN POR CURSO — para reportes en Angular
  // ----------------------------------------------------------------
  async resumenPorCurso(cursoId: string): Promise<any[]> {
    return this.notaRepository
      .createQueryBuilder('n')
      .leftJoin('n.inscripcion', 'i')
      .leftJoin('i.usuario', 'u')
      .where('i.curso_id = :cursoId', { cursoId })
      .andWhere('i.estado = :estado', { estado: 'activa' })
      .select([
        'u.id                                                        AS usuario_id',
        'u.nombre                                                    AS nombre',
        'u.apellido                                                  AS apellido',
        'COUNT(n.id)                                                 AS total_evaluaciones',
        `ROUND(
          AVG(n.valor / NULLIF(n.valor_max, 0) * 5), 2
        )                                                            AS promedio_sobre_5`,
      ])
      .groupBy('u.id, u.nombre, u.apellido')
      .orderBy('u.apellido', 'ASC')
      .getRawMany();
  }

  // ----------------------------------------------------------------
  // NOTAS POR PERIODO EVALUATIVO — para boletín
  // ----------------------------------------------------------------
  async listarPorPeriodo(cursoId: string, periodoEvaluativo: string): Promise<any[]> {
    return this.notaRepository
      .createQueryBuilder('n')
      .leftJoin('n.inscripcion', 'i')
      .leftJoin('i.usuario', 'u')
      .where('i.curso_id = :cursoId', { cursoId })
      .andWhere('n.periodo_evaluativo = :periodo', { periodo: periodoEvaluativo })
      .andWhere('i.estado = :estado', { estado: 'activa' })
      .select([
        'u.nombre                AS nombre',
        'u.apellido              AS apellido',
        'u.documento             AS documento',
        'n.tipo_evaluacion       AS tipo_evaluacion',
        'n.descripcion           AS descripcion',
        'n.valor                 AS valor',
        'n.valor_max             AS valor_max',
        `ROUND(n.valor / NULLIF(n.valor_max, 0) * 5, 2) AS sobre_5`,
        'n.fecha                 AS fecha',
      ])
      .orderBy('u.apellido', 'ASC')
      .addOrderBy('n.fecha', 'ASC')
      .getRawMany();
  }

  // ----------------------------------------------------------------
  // FICHA COMPLETA — asistencia + notas de un estudiante en un curso
  // Usa la vista v_ficha_estudiante_curso
  // ----------------------------------------------------------------
  async fichaEstudiante(inscripcionId: string): Promise<any> {
    const notas = await this.notaRepository.find({
      where: { inscripcionId },
      order: { periodoEvaluativo: 'ASC', fecha: 'ASC' },
    });

    // Agrupar por periodo evaluativo
    const porPeriodo = notas.reduce((acc, nota) => {
      const periodo = nota.periodoEvaluativo ?? 'Sin periodo';
      if (!acc[periodo]) acc[periodo] = [];
      acc[periodo].push({
        tipo:        nota.tipoEvaluacion,
        descripcion: nota.descripcion,
        valor:       nota.valor,
        valorMax:    nota.valorMax,
        sobre5:      +(nota.valor / nota.valorMax * 5).toFixed(2),
        fecha:       nota.fecha,
      });
      return acc;
    }, {} as Record<string, any[]>);

    const promedio = notas.length
      ? +(notas.reduce((sum, n) => sum + (n.valor / n.valorMax * 5), 0) / notas.length).toFixed(2)
      : null;

    return {
      inscripcionId,
      totalEvaluaciones: notas.length,
      promedio,
      porPeriodo,
    };
  }
}