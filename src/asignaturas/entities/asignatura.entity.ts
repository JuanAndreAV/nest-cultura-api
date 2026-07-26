import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Pensum } from '../../programas/entities/pensum.entity';

@Entity('asignaturas')
export class Asignatura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ← ya no tiene programaId ni la relación ManyToOne con Programa

  @Column({ type: 'uuid', name: 'docente_id', nullable: true })
  docenteId: string | null;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'docente_id' })
  docente: User;

  @OneToMany(() => Pensum, pensum => pensum.asignatura)
  pensum: Pensum[];
}