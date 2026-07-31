import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Inscripcion } from '../../inscripciones/entities/inscripcione.entity';

@Entity('notas')
export class Nota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'inscripcion_id' })
  inscripcionId: string;

  @Column({ type: 'text', name: 'tipo_evaluacion' })
  tipoEvaluacion: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'numeric' })
  valor: number;

  @Column({ type: 'numeric', name: 'valor_max', default: 5 })
  valorMax: number;

  @Column({ type: 'text', name: 'periodo_evaluativo', nullable: true })
  periodoEvaluativo: string | null;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Inscripcion)
  @JoinColumn({ name: 'inscripcion_id' })
  inscripcion: Inscripcion;
}