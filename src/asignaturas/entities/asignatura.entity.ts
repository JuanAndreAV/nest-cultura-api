import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Pensum } from '../../programas/entities/pensum.entity';

@Entity('asignaturas')
export class Asignatura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ← ya no tiene programaId ni la relación ManyToOne con Programa

  

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

  

  @OneToMany(() => Pensum, pensum => pensum.asignatura)
  pensum: Pensum[];
}