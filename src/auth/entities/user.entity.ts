import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  nombre: string;

  @Column({ nullable: true })
  apellido: string;

  @Column({ nullable: true, unique: true })
  documento: string;

  @Column({ nullable: true, type: 'date', name: 'fecha_nacimiento' })
  fechaNacimiento: Date;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true, name: 'foto_url' })
  fotoUrl: string;

  @Column({ default: true })
  activo: boolean;

  @Column({
    type: 'enum',
    // Incluye 'profesor' para no romper datos existentes en producción
    enum: ['admin', 'docente', 'estudiante', 'profesor'],
    default: 'estudiante',
  })
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}