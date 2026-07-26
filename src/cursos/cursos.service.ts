import {
  Injectable, NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curso } from './entities/curso.entity';
import { Horario } from './entities/horario.entity';
import { CreateCursoDto, CreateHorarioDto } from './dto/create-curso.dto';

@Injectable()
export class CursosService {
  constructor(
    @InjectRepository(Curso)
    private readonly cursoRepository: Repository<Curso>,
    @InjectRepository(Horario)
    private readonly horarioRepository: Repository<Horario>,
  ) {}

  // ----------------------------------------------------------------
  // CURSOS
  // ----------------------------------------------------------------
  async crear(dto: CreateCursoDto): Promise<Curso> {
    // Validar edades
    if (dto.edadMin && dto.edadMax && dto.edadMax < dto.edadMin) {
      throw new BadRequestException('La edad máxima debe ser mayor a la mínima.');
    }

    const curso = this.cursoRepository.create({
      asignaturaId:            dto.asignaturaId,
      periodoId:               dto.periodoId,
      docenteId:               dto.docenteId ?? null,
      nombre:                  dto.nombre,
      descripcion:             dto.descripcion ?? null,
      capacidadMax:            dto.capacidadMax ?? 20,
      edadMin:                 dto.edadMin ?? null,
      edadMax:                 dto.edadMax ?? null,
      intensidadHoraria:       dto.intensidadHoraria ?? null,
      porcentajeAsistenciaMin: dto.porcentajeAsistenciaMin ?? 80,
      notaAprobatoria:         dto.notaAprobatoria ?? 3,
      requiereNivelPrevio:     dto.requiereNivelPrevio ?? false,
      cursoPrerequisitorId:    dto.cursoPrerequisitorId ?? null,
    });

    const cursoGuardado = await this.cursoRepository.save(curso);

    // Crear horarios si vienen en el DTO
   if (dto.horarios?.length) {
    try {
      await this.agregarHorarios(cursoGuardado.id, dto.horarios);
    } catch (error) {
      // Si falla la creación de horarios, eliminar el curso creado
      await this.cursoRepository.delete(cursoGuardado.id);
      this.manejarErrorHorario(error);
    }
  }

    return this.ver(cursoGuardado.id);
  }

  async listar(filtros?: {
    periodoId?: string;
    asignaturaId?: string;
    docenteId?: string;
  }): Promise<Curso[]> {
    const where: any = { activo: true };
    if (filtros?.periodoId)    where.periodoId    = filtros.periodoId;
    if (filtros?.asignaturaId) where.asignaturaId = filtros.asignaturaId;
    if (filtros?.docenteId)    where.docenteId    = filtros.docenteId;

    return this.cursoRepository.find({
      where,
      relations: [
        'asignatura',
      'asignatura.pensum',
      'asignatura.pensum.programa', // ← actualizado
      'periodo',
      'docente',
      'horarios',
      'horarios.aula',
      ],
      order: { nombre: 'ASC' },
    });
  }

  async ver(id: string): Promise<Curso> {
    const curso = await this.cursoRepository.findOne({
      where: { id },
      relations: [
        'asignatura',
      'asignatura.pensum',
      'asignatura.pensum.programa', // ← antes era 'asignatura.programa'
      'periodo',
      'docente',
      'horarios',
      'horarios.aula',
      'cursoPrerequisito',
      ],
    });
    if (!curso) throw new NotFoundException('Curso no encontrado');
    return curso;
  }

  async actualizar(id: string, dto: Partial<CreateCursoDto>): Promise<Curso> {
    const curso = await this.cursoRepository.findOne({ where: { id } });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    if (dto.edadMin && dto.edadMax && dto.edadMax < dto.edadMin) {
      throw new BadRequestException('La edad máxima debe ser mayor a la mínima.');
    }

    Object.assign(curso, {
      ...(dto.nombre                  && { nombre: dto.nombre }),
      ...(dto.descripcion             && { descripcion: dto.descripcion }),
      ...(dto.docenteId               && { docenteId: dto.docenteId }),
      ...(dto.capacidadMax            && { capacidadMax: dto.capacidadMax }),
      ...(dto.edadMin                 && { edadMin: dto.edadMin }),
      ...(dto.edadMax                 && { edadMax: dto.edadMax }),
      ...(dto.intensidadHoraria       && { intensidadHoraria: dto.intensidadHoraria }),
      ...(dto.porcentajeAsistenciaMin && { porcentajeAsistenciaMin: dto.porcentajeAsistenciaMin }),
      ...(dto.notaAprobatoria         && { notaAprobatoria: dto.notaAprobatoria }),
      ...(dto.requiereNivelPrevio !== undefined && { requiereNivelPrevio: dto.requiereNivelPrevio }),
      ...(dto.cursoPrerequisitorId    && { cursoPrerequisitorId: dto.cursoPrerequisitorId }),
    });

    await this.cursoRepository.save(curso);
    return this.ver(id);
  }

  async desactivar(id: string): Promise<{ mensaje: string }> {
    const curso = await this.cursoRepository.findOne({ where: { id } });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    await this.cursoRepository.update(id, { activo: false });
    return { mensaje: `Curso "${curso.nombre}" desactivado.` };
  }

  // ----------------------------------------------------------------
  // HORARIOS
  // ----------------------------------------------------------------
  async agregarHorarios(cursoId: string, horarios: CreateHorarioDto[]): Promise<Horario[]> {
    const curso = await this.cursoRepository.findOne({ where: { id: cursoId } });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    try {
      const nuevos = horarios.map(h =>
        this.horarioRepository.create({
          cursoId,
          aulaId:     h.aulaId ?? null,
          diaSemana:  h.diaSemana,
          horaInicio: h.horaInicio,
          horaFin:    h.horaFin,
        }),
      );
      return await this.horarioRepository.save(nuevos);
    } catch (error) {
      this.manejarErrorHorario(error);
  }
  }

  async eliminarHorario(horarioId: string): Promise<{ mensaje: string }> {
    const horario = await this.horarioRepository.findOne({
      where: { id: horarioId },
    });
    if (!horario) throw new NotFoundException('Horario no encontrado');

    await this.horarioRepository.delete(horarioId);
    return { mensaje: 'Horario eliminado.' };
  }

  async horariosDelCurso(cursoId: string): Promise<Horario[]> {
    return this.horarioRepository.find({
      where:     { cursoId },
      relations: ['aula'],
      order:     { diaSemana: 'ASC', horaInicio: 'ASC' },
    });
  }

  // Para validar edad al inscribir — lo usará InscripcionesService
  async validarEdadEstudiante(cursoId: string, fechaNacimiento: Date): Promise<void> {
    const curso = await this.cursoRepository.findOne({ where: { id: cursoId } });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    const edad = this.calcularEdad(fechaNacimiento);

    if (curso.edadMin && edad < curso.edadMin) {
      throw new BadRequestException(
        `El estudiante tiene ${edad} años. La edad mínima para este curso es ${curso.edadMin}.`,
      );
    }

    if (curso.edadMax && edad > curso.edadMax) {
      throw new BadRequestException(
        `El estudiante tiene ${edad} años. La edad máxima para este curso es ${curso.edadMax}.`,
      );
    }
  }

  // Para validar cupos al inscribir — lo usará InscripcionesService
  async validarCupos(cursoId: string): Promise<void> {
    const curso = await this.cursoRepository.findOne({ where: { id: cursoId } });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    const inscritos = await this.cursoRepository
      .createQueryBuilder('c')
      .leftJoin('inscripciones', 'i', 'i.curso_id = c.id AND i.estado = :estado', { estado: 'activa' })
      .where('c.id = :id', { id: cursoId })
      .select('COUNT(i.id)', 'total')
      .getRawOne();

    if (parseInt(inscritos.total) >= curso.capacidadMax) {
      throw new BadRequestException(
        `El curso "${curso.nombre}" no tiene cupos disponibles.`,
      );
    }
  }

  private calcularEdad(fechaNacimiento: Date): number {
    const hoy  = new Date();
    const edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const mes  = hoy.getMonth() - fechaNacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
      return edad - 1;
    }
    return edad;
  }

  private manejarErrorHorario(error: any): never {
  // El trigger lanza P0001 cuando el aula está ocupada
  if (error?.driverError?.code === 'P0001' || error?.code === 'P0001') {
    throw new BadRequestException(
      'El aula ya está ocupada en ese horario. Elige otra aula u otro horario.',
    );
  }
  // Constraint unique — curso duplicado en mismo horario
  if (error?.driverError?.code === '23505' || error?.code === '23505') {
    throw new BadRequestException(
      'Ya existe un horario igual para este curso.',
    );
  }
  throw new BadRequestException('Error al guardar el horario: ' + error.message);
}
}