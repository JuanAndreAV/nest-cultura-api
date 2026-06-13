// user.entity.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  nombre: string | null;

  @Column({ type: 'varchar', nullable: true })
  apellido: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  documento: string | null;

  @Column({ type: 'date', nullable: true, name: 'fecha_nacimiento' })
  fechaNacimiento: Date | null;

  @Column({ type: 'varchar', nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'foto_url' })
  fotoUrl: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'boolean', default: false, name: 'email_ficticio' })
  emailFicticio: boolean;

  @Column({
    type: 'enum',
    enum: ['admin', 'docente', 'estudiante', 'profesor'],
    default: 'estudiante',
  })
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}