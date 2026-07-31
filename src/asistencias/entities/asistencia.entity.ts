import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Inscripcion } from '../../inscripciones/entities/inscripcione.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('asistencias')
export class Asistencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'inscripcion_id' })
  inscripcionId: string;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'boolean', default: false })
  asistio: boolean;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @Column({ type: 'uuid', name: 'registrado_por', nullable: true })
  registradoPor: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Inscripcion)
  @JoinColumn({ name: 'inscripcion_id' })
  inscripcion: Inscripcion;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'registrado_por' })
  registrador: User;
}