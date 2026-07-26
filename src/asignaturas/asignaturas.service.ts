import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asignatura } from './entities/asignatura.entity';
import { Pensum } from '../programas/entities/pensum.entity';
import { CreateAsignaturaDto, PensumItemDto } from './dto/create-asignatura.dto';

@Injectable()
export class AsignaturasService {
  constructor(
    @InjectRepository(Asignatura)
    private readonly asignaturaRepository: Repository<Asignatura>,
    @InjectRepository(Pensum)
    private readonly pensumRepository: Repository<Pensum>,
  ) {}

  // ----------------------------------------------------------------
  // CREAR
  // ----------------------------------------------------------------
  async crear(dto: CreateAsignaturaDto): Promise<Asignatura> {
    const existe = await this.asignaturaRepository.findOne({
      where: { nombre: dto.nombre },
    });
    if (existe) {
      throw new BadRequestException(`Ya existe la asignatura "${dto.nombre}".`);
    }

    const asignatura = this.asignaturaRepository.create({
      docenteId:   dto.docenteId ?? null,
      nombre:      dto.nombre,
      descripcion: dto.descripcion ?? null,
    });

    const guardada = await this.asignaturaRepository.save(asignatura);

    // Asociar a programas si vienen en el DTO
    if (dto.programas?.length) {
      await this.asociarProgramas(guardada.id, dto.programas);
    }

    return this.ver(guardada.id);
  }

  // ----------------------------------------------------------------
  // LISTAR
  // Filtra por programa si se indica, sino devuelve todas
  // ----------------------------------------------------------------
  async listar(programaId?: string): Promise<Asignatura[]> {
    if (programaId) {
      return this.asignaturaRepository
        .createQueryBuilder('a')
        .leftJoinAndSelect('a.pensum', 'pn')
        .leftJoinAndSelect('pn.programa', 'pr')
        .leftJoinAndSelect('a.docente', 'd')
        .where('pn.programa_id = :programaId', { programaId })
        .andWhere('a.activo = true')
        .orderBy('pn.orden', 'ASC')
        .addOrderBy('a.nombre', 'ASC')
        .getMany();
    }

    return this.asignaturaRepository.find({
      where:     { activo: true },
      relations: ['pensum', 'pensum.programa', 'docente'],
      order:     { nombre: 'ASC' },
    });
  }

  // ----------------------------------------------------------------
  // VER UNA
  // ----------------------------------------------------------------
  async ver(id: string): Promise<Asignatura> {
    const asignatura = await this.asignaturaRepository.findOne({
      where:     { id },
      relations: ['pensum', 'pensum.programa', 'docente'],
    });
    if (!asignatura) throw new NotFoundException('Asignatura no encontrada');
    return asignatura;
  }

  // ----------------------------------------------------------------
  // ACTUALIZAR
  // ----------------------------------------------------------------
  async actualizar(id: string, dto: Partial<CreateAsignaturaDto>): Promise<Asignatura> {
    const asignatura = await this.asignaturaRepository.findOne({ where: { id } });
    if (!asignatura) throw new NotFoundException('Asignatura no encontrada');

    Object.assign(asignatura, {
      ...(dto.nombre      && { nombre: dto.nombre }),
      ...(dto.descripcion && { descripcion: dto.descripcion }),
      ...(dto.docenteId   && { docenteId: dto.docenteId }),
    });

    await this.asignaturaRepository.save(asignatura);
    return this.ver(id);
  }

  // ----------------------------------------------------------------
  // DESACTIVAR
  // ----------------------------------------------------------------
  async desactivar(id: string): Promise<{ mensaje: string }> {
    const asignatura = await this.asignaturaRepository.findOne({ where: { id } });
    if (!asignatura) throw new NotFoundException('Asignatura no encontrada');

    await this.asignaturaRepository.update(id, { activo: false });
    return { mensaje: `Asignatura "${asignatura.nombre}" desactivada.` };
  }

  // ----------------------------------------------------------------
  // PENSUM — asociar asignatura a programas
  // ----------------------------------------------------------------
  async asociarProgramas(
    asignaturaId: string,
    programas: PensumItemDto[],
  ): Promise<{ mensaje: string }> {
    const asignatura = await this.asignaturaRepository.findOne({
      where: { id: asignaturaId },
    });
    if (!asignatura) throw new NotFoundException('Asignatura no encontrada');

    for (const p of programas) {
      await this.pensumRepository
        .createQueryBuilder()
        .insert()
        .into(Pensum)
        .values({
          asignaturaId,
          programaId:  p.programaId,
          obligatoria: p.obligatoria ?? true,
          orden:       p.orden ?? null,
        })
        .orIgnore() // ON CONFLICT DO NOTHING
        .execute();
    }

    return { mensaje: `Asignatura asociada a ${programas.length} programa(s).` };
  }

  // ----------------------------------------------------------------
  // PENSUM — desasociar asignatura de un programa
  // ----------------------------------------------------------------
  async desasociarPrograma(
    asignaturaId: string,
    programaId: string,
  ): Promise<{ mensaje: string }> {
    const pensum = await this.pensumRepository.findOne({
      where: { asignaturaId, programaId },
    });
    if (!pensum) {
      throw new NotFoundException('La asignatura no está asociada a ese programa.');
    }

    await this.pensumRepository.delete({ asignaturaId, programaId });
    return { mensaje: 'Asignatura desasociada del programa.' };
  }

  // ----------------------------------------------------------------
  // PENSUM — listar programas de una asignatura
  // ----------------------------------------------------------------
  async programasDeAsignatura(asignaturaId: string): Promise<Pensum[]> {
    const asignatura = await this.asignaturaRepository.findOne({
      where: { id: asignaturaId },
    });
    if (!asignatura) throw new NotFoundException('Asignatura no encontrada');

    return this.pensumRepository.find({
      where:     { asignaturaId },
      relations: ['programa'],
      order:     { orden: 'ASC' },
    });
  }

  // ----------------------------------------------------------------
  // PENSUM — actualizar atributos (obligatoria, orden)
  // ----------------------------------------------------------------
  async actualizarPensum(
    asignaturaId: string,
    programaId: string,
    datos: { obligatoria?: boolean; orden?: number },
  ): Promise<Pensum> {
    const pensum = await this.pensumRepository.findOne({
      where: { asignaturaId, programaId },
    });
    if (!pensum) {
      throw new NotFoundException('Relación pensum no encontrada.');
    }

    Object.assign(pensum, {
      ...(datos.obligatoria !== undefined && { obligatoria: datos.obligatoria }),
      ...(datos.orden       !== undefined && { orden: datos.orden }),
    });

    return this.pensumRepository.save(pensum);
  }
}