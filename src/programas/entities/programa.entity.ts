import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Periodo } from './periodo.entity';
import { Pensum } from './pensum.entity';

export enum AreaArtistica {
  MUSICA              = 'Música',
  DANZA               = 'Danza',
  ARTES_PLASTICAS     = 'Artes Plásticas',
  TEATRO              = 'Teatro',
  LITERATURA          = 'Literatura y Biblioteca',
  PRODUCCION          = 'Producción',
  OTRO                = 'Otro',
}

@Entity('programas_academicos')
export class Programa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'text', nullable: true, name: 'color_hex', default: '#6366f1' })
  colorHex: string | null;

  @Column({
    type: 'enum',
    enum: AreaArtistica,
    enumName: 'area_artistica_enum', // nombre exacto del enum en PostgreSQL
    default: AreaArtistica.MUSICA,
  })
  area: AreaArtistica;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  

   @OneToMany(() => Pensum, pensum => pensum.programa)
  pensum: Pensum[];


}