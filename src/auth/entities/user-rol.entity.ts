
import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";

@Entity('user_rol')
export class UserRolEntity {
  @PrimaryColumn('uuid', { name: 'usuario_id' })
  usuarioId: string;

  @PrimaryColumn({ name: 'rol' })
  rol: string;

  @CreateDateColumn({ name: 'asignado_en' })
  asignadoEn: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;
}
