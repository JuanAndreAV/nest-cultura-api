import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Asignatura } from '../../asignaturas/entities/asignatura.entity';
import { Periodo } from '../../programas/entities/periodo.entity';
import { User } from '../../auth/entities/user.entity';
import { Horario } from './horario.entity';

@Entity('cursos')
export class Curso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'asignatura_id' })
  asignaturaId: string;

  @Column({ type: 'uuid', name: 'periodo_id' })
  periodoId: string;

  @Column({ type: 'uuid', name: 'docente_id', nullable: true })
  docenteId: string | null;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'int', name: 'capacidad_max', default: 20 })
  capacidadMax: number;

  @Column({ type: 'int', name: 'edad_min', nullable: true })
  edadMin: number | null;

  @Column({ type: 'int', name: 'edad_max', nullable: true })
  edadMax: number | null;

  @Column({ type: 'numeric', name: 'intensidad_horaria', nullable: true })
  intensidadHoraria: number | null;

  @Column({ type: 'numeric', name: 'porcentaje_asistencia_min', default: 80 })
  porcentajeAsistenciaMin: number;

  @Column({ type: 'numeric', name: 'nota_aprobatoria', default: 3 })
  notaAprobatoria: number;

  @Column({ type: 'boolean', name: 'requiere_nivel_previo', default: false })
  requiereNivelPrevio: boolean;

  @Column({ type: 'uuid', name: 'curso_prerequisito_id', nullable: true })
  cursoPrerequisitoId: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Asignatura)
  @JoinColumn({ name: 'asignatura_id' })
  asignatura: Asignatura;

  @ManyToOne(() => Periodo)
  @JoinColumn({ name: 'periodo_id' })
  periodo: Periodo;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'docente_id' })
  docente: User;

  @ManyToOne(() => Curso)
  @JoinColumn({ name: 'curso_prerequisito_id' })
  cursoPrerequisito: Curso;

  @OneToMany(() => Horario, horario => horario.curso)
  horarios: Horario[];
}