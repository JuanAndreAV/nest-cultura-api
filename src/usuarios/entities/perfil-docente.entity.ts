// perfil-docente.entity.ts
import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('perfiles_docente')
export class PerfilDocente {
  @PrimaryColumn('uuid', { name: 'usuario_id' })
  usuarioId: string;

  @Column({ type: 'varchar' })
  especialidad: string;

  @Column({ name: 'tipo_vinculacion', type: 'varchar' })
  tipoVinculacion: string;

  @Column({ name: 'tarifa_hora', type: 'numeric' })
  tarifaHora: number;

  @Column({ name: 'hoja_vida_url', type: 'varchar', nullable: true })
  hojaVidaUrl: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;
}