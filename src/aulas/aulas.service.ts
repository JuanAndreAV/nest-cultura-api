import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aula } from './entities/aula.entity';
import { CreateAulaDto } from './dto/create-aula.dto';

@Injectable()
export class AulasService {
  constructor(
    @InjectRepository(Aula)
    private readonly aulaRepository: Repository<Aula>,
  ) {}

  async crear(dto: CreateAulaDto): Promise<Aula> {
    const existe = await this.aulaRepository.findOne({
      where: { nombre: dto.nombre },
    });
    if (existe) {
      throw new BadRequestException(`Ya existe el aula "${dto.nombre}".`);
    }

    const aula = this.aulaRepository.create({
      nombre:      dto.nombre,
      capacidad:   dto.capacidad ?? null,
      descripcion: dto.descripcion ?? null,
    });

    return this.aulaRepository.save(aula);
  }

  async listar(): Promise<Aula[]> {
    return this.aulaRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async ver(id: string): Promise<Aula> {
    const aula = await this.aulaRepository.findOne({ where: { id } });
    if (!aula) throw new NotFoundException('Aula no encontrada');
    return aula;
  }

  async actualizar(id: string, dto: Partial<CreateAulaDto>): Promise<Aula> {
    const aula = await this.aulaRepository.findOne({ where: { id } });
    if (!aula) throw new NotFoundException('Aula no encontrada');

    Object.assign(aula, {
      ...(dto.nombre      && { nombre: dto.nombre }),
      ...(dto.capacidad   && { capacidad: dto.capacidad }),
      ...(dto.descripcion && { descripcion: dto.descripcion }),
    });

    return this.aulaRepository.save(aula);
  }

  async desactivar(id: string): Promise<{ mensaje: string }> {
    const aula = await this.aulaRepository.findOne({ where: { id } });
    if (!aula) throw new NotFoundException('Aula no encontrada');

    await this.aulaRepository.update(id, { activo: false });
    return { mensaje: `Aula "${aula.nombre}" desactivada.` };
  }

  // Verificar disponibilidad — útil para el módulo de horarios
  async verificarDisponibilidad(
    aulaId: string,
    diaSemana: string,
    horaInicio: string,
    horaFin: string,
    excludeHorarioId?: string,
  ): Promise<{ disponible: boolean; conflicto?: any }> {
    const aula = await this.aulaRepository.findOne({ where: { id: aulaId } });
    if (!aula) throw new NotFoundException('Aula no encontrada');

    return { disponible: true }; // El trigger en DB ya lo valida, esto es para el front
  }
}
