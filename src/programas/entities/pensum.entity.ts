import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Programa } from './programa.entity';
import { Asignatura } from '../../asignaturas/entities/asignatura.entity';

@Entity('pensum')
export class Pensum {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'programa_id' })
  programaId: string;

  @Column({ type: 'uuid', name: 'asignatura_id' })
  asignaturaId: string;

  @Column({ type: 'boolean', default: true })
  obligatoria: boolean;

  @Column({ type: 'int', nullable: true })
  orden: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Programa, programa => programa.pensum)
  @JoinColumn({ name: 'programa_id' })
  programa: Programa;

  @ManyToOne(() => Asignatura, asignatura => asignatura.pensum)
  @JoinColumn({ name: 'asignatura_id' })
  asignatura: Asignatura;
}