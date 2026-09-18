import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
export enum UserRole {
  ADMIN = 'admin',
  DOCENTE = 'docente',
  ESTUDIANTE = 'estudiante',
}
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
    type: 'text',
    array: true,
    default: [UserRole.ESTUDIANTE],
  })
  roles: UserRole[] | string[];

  // --- Campos comunes (personas) ---
  @Column({ type: 'varchar', nullable: true, name: 'tipo_identificacion' })
  tipoIdentificacion: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'segundo_nombre' })
  segundoNombre: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'segundo_apellido' })
  segundoApellido: string | null;

  @Column({ type: 'varchar', nullable: true })
  genero: string | null;

  @Column({ type: 'varchar', nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', nullable: true })
  barrio: string | null;

  @Column({ type: 'varchar', nullable: true })
  municipio: string | null;

  @Column({ type: 'varchar', nullable: true })
  departamento: string | null;

  @Column({ type: 'varchar', nullable: true, default: 'Colombia' })
  pais: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'municipio_nacimiento' })
  municipioNacimiento: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'departamento_nacimiento' })
  departamentoNacimiento: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'pais_nacimiento' })
  paisNacimiento: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'zona_residencia' })
  zonaResidencia: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'enfoque_poblacional' })
  enfoquePoblacional: string | null;

  @Column({ type: 'boolean', nullable: true, default: false, name: 'tiene_discapacidad' })
  tieneDiscapacidad: boolean | null;

  @Column({ type: 'varchar', nullable: true, name: 'tipo_discapacidad' })
  tipoDiscapacidad: string | null;

  @Column({ type: 'smallint', nullable: true })
  estrato: number | null;

  @Column({ type: 'varchar', nullable: true })
  eps: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}