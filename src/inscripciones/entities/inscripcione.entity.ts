import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Curso } from '../../cursos/entities/curso.entity';

export enum EstadoInscripcion {
  PENDIENTE  = 'pendiente',
  ACTIVA     = 'activa',
  RETIRADA   = 'retirada',
  SUSPENDIDA = 'suspendida',
  FINALIZADA = 'finalizada',
}

@Entity('inscripciones')
export class Inscripcion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'usuario_id' })
  usuarioId: string;
  @Column({ type: 'uuid', name: 'curso_id' })
  cursoId: string;

  @Column({ type: 'date', name: 'fecha_inscripcion', default: () => 'CURRENT_DATE' })
  fechaInscripcion: Date;

  @Column({ type: 'text', default: EstadoInscripcion.ACTIVA })
  estado: EstadoInscripcion;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @ManyToOne(() => Curso)
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;
}