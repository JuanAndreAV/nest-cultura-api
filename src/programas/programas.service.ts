import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Programa } from './entities/programa.entity';
import { Periodo } from './entities/periodo.entity';
import { CreateProgramaDto } from './dto/create-programa.dto';
import { CreatePeriodoDto } from './dto/create-periodo.dto';

@Injectable()
export class ProgramasService {
  constructor(
    @InjectRepository(Programa)
    private readonly programaRepository: Repository<Programa>,
    @InjectRepository(Periodo)
    private readonly periodoRepository: Repository<Periodo>,
  ) {}

  // ----------------------------------------------------------------
  // PROGRAMAS
  // ----------------------------------------------------------------
  async crearPrograma(dto: CreateProgramaDto): Promise<Programa> {
    const existe = await this.programaRepository.findOne({
      where: { nombre: dto.nombre },
    });
    if (existe) {
      throw new BadRequestException(`Ya existe el programa "${dto.nombre}".`);
    }

    const programa = this.programaRepository.create({
      nombre:      dto.nombre,
      descripcion: dto.descripcion ?? null,
      colorHex:    dto.colorHex ?? '#6366f1',
    });

    return this.programaRepository.save(programa);
  }

  async listarProgramas(): Promise<Programa[]> {
    return this.programaRepository.find({
      where:   { activo: true },
      order:   { nombre: 'ASC' },
      
    });
  }

  async verPrograma(id: string): Promise<Programa> {
    const programa = await this.programaRepository.findOne({
      where:     { id },
     
    });
    if (!programa) throw new NotFoundException('Programa no encontrado');
    return programa;
  }

  async actualizarPrograma(id: string, dto: Partial<CreateProgramaDto>): Promise<Programa> {
    const programa = await this.programaRepository.findOne({ where: { id } });
    if (!programa) throw new NotFoundException('Programa no encontrado');

    Object.assign(programa, {
      ...(dto.nombre      && { nombre: dto.nombre }),
      ...(dto.descripcion && { descripcion: dto.descripcion }),
      ...(dto.colorHex    && { colorHex: dto.colorHex }),
    });

    return this.programaRepository.save(programa);
  }

  async desactivarPrograma(id: string): Promise<{ mensaje: string }> {
    const programa = await this.programaRepository.findOne({ where: { id } });
    if (!programa) throw new NotFoundException('Programa no encontrado');

    await this.programaRepository.update(id, { activo: false });
    return { mensaje: `Programa "${programa.nombre}" desactivado.` };
  }

  // ----------------------------------------------------------------
  // PERIODOS
  // ----------------------------------------------------------------
  async crearPeriodo(dto: CreatePeriodoDto): Promise<Periodo> {
  if (new Date(dto.fechaFin) <= new Date(dto.fechaInicio)) {
    throw new BadRequestException('La fecha de fin debe ser mayor a la de inicio.');
  }

  const solapado = await this.periodoRepository
    .createQueryBuilder('p')
    .where('p.activo = true')
    .andWhere(
      '(:inicio BETWEEN p.fecha_inicio AND p.fecha_fin OR :fin BETWEEN p.fecha_inicio AND p.fecha_fin)',
      { inicio: dto.fechaInicio, fin: dto.fechaFin },
    )
    .getOne();

  if (solapado) {
    throw new BadRequestException(
      `Las fechas se solapan con el periodo "${solapado.nombre}".`,
    );
  }

  const periodo = this.periodoRepository.create({
    nombre:      dto.nombre,
    fechaInicio: new Date(dto.fechaInicio),
    fechaFin:    new Date(dto.fechaFin),
  });

  return this.periodoRepository.save(periodo);
}

async listarPeriodos(): Promise<Periodo[]> {
  
  return this.periodoRepository.find({
    where: { activo: true },
    order: { fechaInicio: 'DESC' },
  });
}

async periodoActivo(): Promise<Periodo | null> {
  return this.periodoRepository
    .createQueryBuilder('p')
    .where('p.activo = true')
    .andWhere('p.fecha_inicio <= CURRENT_DATE')
    .andWhere('p.fecha_fin >= CURRENT_DATE')
    .getOne();
}

async actualizarPeriodo(id: string, dto: Partial<CreatePeriodoDto>): Promise<Periodo> {
  const periodo = await this.periodoRepository.findOne({ where: { id } });
  if (!periodo) throw new NotFoundException('Periodo no encontrado');

  Object.assign(periodo, {
    ...(dto.nombre       && { nombre: dto.nombre }),
    ...(dto.fechaInicio  && { fechaInicio: new Date(dto.fechaInicio) }),
    ...(dto.fechaFin     && { fechaFin: new Date(dto.fechaFin) }),
  });

  return this.periodoRepository.save(periodo);
}

async desactivarPeriodo(id: string): Promise<{ mensaje: string }> {
  const periodo = await this.periodoRepository.findOne({ where: { id } });
  if (!periodo) throw new NotFoundException('Periodo no encontrado');

  await this.periodoRepository.update(id, { activo: false });
  return { mensaje: `Periodo "${periodo.nombre}" desactivado.` };
}
}