import {
  Injectable, NotFoundException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inscripcion, EstadoInscripcion } from './entities/inscripcione.entity';
import { CreateInscripcionDto, CambiarEstadoDto } from './dto/create-inscripcione.dto';
import { CursosService } from '../cursos/cursos.service';
import { UsuariosService } from '../usuarios/usuarios.service';

@Injectable()
export class InscripcionesService {
  constructor(
    @InjectRepository(Inscripcion)
    private readonly inscripcionRepository: Repository<Inscripcion>,
    private readonly cursosService: CursosService,
    private readonly usuariosService: UsuariosService,
  ) {}

  // ----------------------------------------------------------------
  // PRE-INSCRIPCIÓN (desde link del profesor)
  // ----------------------------------------------------------------
  async preInscribir(dto: CreateInscripcionDto): Promise<Inscripcion> {
   await this.validarInscripcion(dto.usuarioId, dto.cursoId);

    const inscripcion = this.inscripcionRepository.create({
      usuarioId:     dto.usuarioId,
      cursoId:       dto.cursoId,
      estado:        EstadoInscripcion.PENDIENTE,
      observaciones: dto.observaciones ?? null,
    });

    return this.inscripcionRepository.save(inscripcion);
  }

  // ----------------------------------------------------------------
  // INSCRIPCIÓN DIRECTA (admin inscribe directamente)
  // ----------------------------------------------------------------
  async inscribir(dto: CreateInscripcionDto): Promise<Inscripcion> {
    await this.validarInscripcion(dto.usuarioId, dto.cursoId);

    const inscripcion = this.inscripcionRepository.create({
      usuarioId:     dto.usuarioId,
      cursoId:       dto.cursoId,
      estado:        EstadoInscripcion.ACTIVA,
      observaciones: dto.observaciones ?? null,
    });

    return this.inscripcionRepository.save(inscripcion);
  }

  // ----------------------------------------------------------------
  // APROBAR PRE-INSCRIPCIÓN (docente o admin)
  // ----------------------------------------------------------------
  async aprobar(inscripcionId: string, usuarioQueAprueba: any): Promise<Inscripcion> {
    const inscripcion = await this.inscripcionRepository.findOne({
      where: { id: inscripcionId },
      relations: ['curso'],
    });

    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

    if (inscripcion.estado !== EstadoInscripcion.PENDIENTE) {
      throw new BadRequestException(
        `Solo se pueden aprobar inscripciones pendientes. Estado actual: ${inscripcion.estado}`,
      );
    }

    // Verificar que el docente solo apruebe inscripciones de sus cursos
    if (!usuarioQueAprueba.es_admin) {
      if (inscripcion.curso.docenteId !== usuarioQueAprueba.id) {
        throw new ForbiddenException('Solo puedes aprobar inscripciones de tus cursos.');
      }
    }

    // Verificar cupos antes de aprobar
    await this.cursosService.validarCupos(inscripcion.cursoId);

    inscripcion.estado = EstadoInscripcion.ACTIVA;
    return this.inscripcionRepository.save(inscripcion);
  }

  // ----------------------------------------------------------------
  // CAMBIAR ESTADO (retirar, suspender, finalizar)
  // ----------------------------------------------------------------
  async cambiarEstado(
    inscripcionId: string,
    dto: CambiarEstadoDto,
    usuarioActual: any,
  ): Promise<Inscripcion> {
    const inscripcion = await this.inscripcionRepository.findOne({
      where: { id: inscripcionId },
      relations: ['curso'],
    });

    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

    // Estudiante solo puede retirarse de sus propias inscripciones
    if (!usuarioActual.es_admin && !usuarioActual.es_docente) {
      if (inscripcion.usuarioId !== usuarioActual.id) {
        throw new ForbiddenException('No puedes modificar esta inscripción.');
      }
      if (dto.estado !== EstadoInscripcion.RETIRADA) {
        throw new ForbiddenException('Solo puedes retirarte de un curso.');
      }
    }

    inscripcion.estado        = dto.estado;
    inscripcion.observaciones = dto.observaciones ?? inscripcion.observaciones;
    return this.inscripcionRepository.save(inscripcion);
  }

  // ----------------------------------------------------------------
  // LISTAR
  // ----------------------------------------------------------------
  async listarPorCurso(cursoId: string): Promise<Inscripcion[]> {
    return this.inscripcionRepository.find({
      where:     { cursoId },
      relations: ['usuario'],
      order:     { createdAt: 'DESC' },
    });
  }

  async listarPorEstudiante(usuarioId: string): Promise<Inscripcion[]> {
    return this.inscripcionRepository.find({
      where:     { usuarioId },
      relations: ['curso', 'curso.asignatura', 'curso.horarios', 'curso.horarios.aula'],
      order:     { createdAt: 'DESC' },
    });
  }

  async listarPendientes(docenteId?: string): Promise<Inscripcion[]> {
    const query = this.inscripcionRepository
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.usuario', 'u')
      .leftJoinAndSelect('i.curso', 'c')
      .leftJoinAndSelect('c.asignatura', 'a')
      .where('i.estado = :estado', { estado: EstadoInscripcion.PENDIENTE });

    if (docenteId) {
      query.andWhere('c.docente_id = :docenteId', { docenteId });
    }

    return query.orderBy('i.created_at', 'DESC').getMany();
  }

  // ----------------------------------------------------------------
  // VALIDACIONES
  // ----------------------------------------------------------------
  private async validarInscripcion(usuarioId: string, cursoId: string): Promise<void> {
    // Verificar que no esté ya inscrito
    const yaInscrito = await this.inscripcionRepository.findOne({
      where: [
        { usuarioId, cursoId, estado: EstadoInscripcion.ACTIVA },
        { usuarioId, cursoId, estado: EstadoInscripcion.PENDIENTE },
        
      ],
    });
    
    if (yaInscrito) {
      throw new BadRequestException(
        `El estudiante ya tiene una inscripción ${yaInscrito.estado} en este curso.`,
      );
    }

    // Verificar edad
    //const perfil = await this.usuariosService.verificarDocumento('');
    const usuario = await this.inscripcionRepository.manager
      .getRepository('users')
      .findOne({ where: { id: usuarioId } });

    if (usuario?.fechaNacimiento) {
      await this.cursosService.validarEdadEstudiante(cursoId, usuario.fechaNacimiento);
    }

    // Verificar cupos solo para inscripción directa
    // Para pre-inscripción se validan al aprobar
  }
}