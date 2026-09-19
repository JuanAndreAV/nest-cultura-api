// perfil-estudiante.entity.ts
import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('perfiles_estudiante')
export class PerfilEstudiante {
  @PrimaryColumn('uuid', { name: 'usuario_id' })
  usuarioId: string;

  @Column({ name: 'acudiente_nombre', type: 'varchar' })
  acudienteNombre: string;

  @Column({ name: 'acudiente_telefono', type: 'varchar' })
  acudienteTelefono: string;

  @Column({ name: 'acudiente_parentesco', type: 'varchar' })
  acudienteParentesco: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;
}