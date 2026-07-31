import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
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
    if (dto.edadMin && dto.edadMax && dto.edadMax < dto.edadMin) {
      throw new BadRequestException('La edad máxima debe ser mayor a la mínima.');
    }

    try {
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
        cursoPrerequisitoId:     dto.cursoPrerequisitoId ?? null,
      });

      const cursoGuardado = await this.cursoRepository.save(curso);

      if (dto.horarios?.length) {
        try {
          await this.agregarHorarios(cursoGuardado.id, dto.horarios);
        } catch (error) {
          await this.cursoRepository.delete(cursoGuardado.id);
          this.manejarErrorHorario(error);
        }
      }

      return await this.ver(cursoGuardado.id);
    } catch (error) {
      this.manejarErrorGeneral(error);
    }
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
        'asignatura.pensum.programa', // Jerarquía correcta
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
        'asignatura.pensum.programa', // Jerarquía correcta
        'periodo',
        'docente',
        'horarios',
        'horarios.aula',
        'cursoPrerequisito',
        'estado'
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

    try {
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
        ...(dto.cursoPrerequisitoId     && { cursoPrerequisitoId: dto.cursoPrerequisitoId }),
      });

      await this.cursoRepository.save(curso);
      return await this.ver(id);
    } catch (error) {
      this.manejarErrorGeneral(error);
    }
  }

  async desactivar(id: string): Promise<{ mensaje: string }> {
    const curso = await this.cursoRepository.findOne({ where: { id } });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    await this.cursoRepository.update(id, { activo: false });
    return { mensaje: `Curso "${curso.nombre}" desactivado con éxito.` };
  }

  // ----------------------------------------------------------------
  // HORARIOS
  // ----------------------------------------------------------------
  async agregarHorarios(cursoId: string, horarios: CreateHorarioDto[]): Promise<Horario[]> {
    const curso = await this.cursoRepository.findOne({ where: { id: cursoId } });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    try {
      const nuevos = horarios.map((h) =>
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
    const horario = await this.horarioRepository.findOne({ where: { id: horarioId } });
    if (!horario) throw new NotFoundException('Horario no encontrado');

    await this.horarioRepository.delete(horarioId);
    return { mensaje: 'Horario eliminado con éxito.' };
  }

  async horariosDelCurso(cursoId: string): Promise<Horario[]> {
    return this.horarioRepository.find({
      where:     { cursoId },
      relations: ['aula'],
      order:     { diaSemana: 'ASC', horaInicio: 'ASC' },
    });
  }

  // ----------------------------------------------------------------
  // VALIDACIONES E INSCRIPCIONES
  // ----------------------------------------------------------------
  async validarEdadEstudiante(cursoId: string, fechaNacimiento: Date): Promise<void> {
    const curso = await this.cursoRepository.findOne({ where: { id: cursoId } });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    const edad = this.calcularEdad(fechaNacimiento);

    if (curso.edadMin && edad < curso.edadMin) {
      throw new BadRequestException(
        `El estudiante tiene ${edad} años. La edad mínima requerida es ${curso.edadMin} años.`,
      );
    }

    if (curso.edadMax && edad > curso.edadMax) {
      throw new BadRequestException(
        `El estudiante tiene ${edad} años. La edad máxima permitida es ${curso.edadMax} años.`,
      );
    }
  }

  async validarCupos(cursoId: string): Promise<void> {
    const curso = await this.cursoRepository.findOne({ where: { id: cursoId } });
    if (!curso) throw new NotFoundException('Curso no encontrado');

    const result = await this.cursoRepository
      .createQueryBuilder('c')
      .leftJoin('inscripciones', 'i', 'i.curso_id = c.id AND i.estado = :estado', { estado: 'activa' })
      .where('c.id = :id', { id: cursoId })
      .select('COUNT(i.id)', 'total')
      .getRawOne();

    const inscritos = parseInt(result?.total || '0', 10);

    if (inscritos >= curso.capacidadMax) {
      throw new BadRequestException(`El curso "${curso.nombre}" no cuenta con cupos disponibles.`);
    }
  }

  async cursosDisponibles(filtros: {
  periodoId?:  string;
  programaId?: string;
  usuarioId?:  string;
}): Promise<any[]> {
  // Construir query base
  const query = this.cursoRepository
    .createQueryBuilder('c')
    .leftJoin('c.asignatura', 'a')
    .leftJoin('a.pensum', 'pn')
    .leftJoin('pn.programa', 'pr')
    .leftJoin('c.periodo', 'per')
    .leftJoin('c.horarios', 'h')
    .leftJoin('h.aula', 'au')
    .leftJoin(
      'inscripciones',
      'i',
      'i.curso_id = c.id AND i.estado = :activa',
      { activa: 'activa' },
    )
    .leftJoin(
      'inscripciones',
      'ie',
      'ie.curso_id = c.id AND ie.estado = :espera',
      { espera: 'en_espera' },
    )
    .leftJoin(
      'inscripciones',
      'ip',
      'ip.curso_id = c.id AND ip.estado = :pendiente',
      { pendiente: 'pendiente' },
    
    )
    .where('c.activo = true')
    .select([
      'c.id                                    AS id',
      'c.nombre                                AS nombre',
      'c.descripcion                           AS descripcion',
      'c.capacidad_max                         AS capacidad_max',
      'c.edad_min                              AS edad_min',
      'c.edad_max                              AS edad_max',
      'c.intensidad_horaria                    AS intensidad_horaria',
      'a.nombre                                AS asignatura',
      'pr.id                                   AS programa_id',
      'pr.nombre                               AS programa',
      'pr.color_hex                            AS programa_color',
      'per.id                                  AS periodo_id',
      'per.nombre                         AS periodo',          
                               
      'COUNT(DISTINCT i.id)                    AS inscritos',
       'COUNT(DISTINCT ip.id)                   AS pendientes', 
      'c.capacidad_max - (COUNT(DISTINCT i.id ) + COUNT(DISTINCT ip.id))  AS cupos_disponibles',
      'COUNT(DISTINCT ie.id)                   AS en_espera',
      
      `CASE
        WHEN COUNT(DISTINCT i.id) < c.capacidad_max THEN 'disponible'
        ELSE 'lleno'
       END                                     AS estado_cupos`,
    ])
    .groupBy('c.id, a.id, pn.id, pr.id, per.id, h.id, au.id');

  if (filtros.periodoId) {
    query.andWhere('c.periodo_id = :periodoId', { periodoId: filtros.periodoId });
  }

  if (filtros.programaId) {
    query.andWhere('pr.id = :programaId', { programaId: filtros.programaId });
  }

  // Filtrar automáticamente por edad del estudiante
  if (filtros.usuarioId) {
    const usuario = await this.cursoRepository.manager
      .getRepository('users')
      .findOne({ where: { id: filtros.usuarioId } });

    if (usuario?.fechaNacimiento) {
      const edad = this.calcularEdad(new Date(usuario.fechaNacimiento));
      query.andWhere(
        '(c.edad_min IS NULL OR c.edad_min <= :edad) AND (c.edad_max IS NULL OR c.edad_max >= :edad)',
        { edad },
      );
    }
  }

  const cursos = await query.getRawMany();

  // Agrupar horarios por curso
  const cursosConHorarios = await Promise.all(
    cursos.map(async curso => {
      const horarios = await this.horarioRepository.find({
        where:     { cursoId: curso.id },
        relations: ['aula'],
        order:     { diaSemana: 'ASC', horaInicio: 'ASC' },
      });
      return { ...curso, horarios };
    }),
  );

  return cursosConHorarios;
}

  // ----------------------------------------------------------------
  // MÉTODOS PRIVADOS Y MANEJO DE ERRORES
  // ----------------------------------------------------------------
  private calcularEdad(fechaNacimiento: Date | string): number {
  // Asegurar que siempre sea una instancia de Date
  const fechaNac = typeof fechaNacimiento === 'string' 
    ? new Date(fechaNacimiento) 
    : fechaNacimiento;

  // Validar si la fecha provista es válida
  if (!fechaNac || isNaN(fechaNac.getTime())) {
    throw new BadRequestException('La fecha de nacimiento del estudiante no es válida.');
  }

  const hoy  = new Date();
  let edad   = hoy.getFullYear() - fechaNac.getFullYear();
  const mes  = hoy.getMonth() - fechaNac.getMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }

  return edad;
}

  private manejarErrorHorario(error: any): never {
    if (error?.driverError?.code === 'P0001' || error?.code === 'P0001') {
      throw new BadRequestException('El aula ya se encuentra ocupada en ese horario.');
    }
    if (error?.driverError?.code === '23505' || error?.code === '23505') {
      throw new BadRequestException('Ya existe un horario asignado igual para este curso.');
    }
    throw new BadRequestException(`Error al procesar el horario: ${error.message}`);
  }

  private manejarErrorGeneral(error: any): never {
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      throw error;
    }
    if (error?.code === '23503' || error?.driverError?.code === '23503') {
      throw new BadRequestException('El ID asignado de asignatura, periodo, docente o prerrequisito no existe.');
    }
    if (error?.code === '23505' || error?.driverError?.code === '23505') {
      throw new BadRequestException('Ya existe un registro con esos datos únicos.');
    }
    throw new InternalServerErrorException(`Error inesperado en el servidor: ${error.message}`);
  }
}