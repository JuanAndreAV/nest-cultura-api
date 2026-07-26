import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Curso } from './curso.entity';
import { Aula } from '../../aulas/entities/aula.entity';

export enum DiaSemana {
  LUNES     = 'lunes',
  MARTES    = 'martes',
  MIERCOLES = 'miercoles',
  JUEVES    = 'jueves',
  VIERNES   = 'viernes',
  SABADO    = 'sabado',
  DOMINGO   = 'domingo',
}

@Entity('horarios')
export class Horario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'curso_id' })
  cursoId: string;

  @Column({ type: 'uuid', name: 'aula_id', nullable: true })
  aulaId: string | null;

  @Column({
    type: 'text',
    name: 'dia_semana',
  })
  diaSemana: DiaSemana;

  @Column({ type: 'time', name: 'hora_inicio' })
  horaInicio: string;

  @Column({ type: 'time', name: 'hora_fin' })
  horaFin: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Curso, curso => curso.horarios)
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @ManyToOne(() => Aula)
  @JoinColumn({ name: 'aula_id' })
  aula: Aula;
}