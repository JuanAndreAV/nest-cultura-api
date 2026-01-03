import { Entity, PrimaryColumn,Column, CreateDateColumn } from "typeorm";

@Entity('users')
export class User {
@PrimaryColumn('uuid')  
id:string;

@Column({unique: true})
email:string;


@Column({ nullable: true }) // El nombre se puede llenar después o en el registro
  nombre: string;


@Column({
    type: 'enum',
    enum: ['admin', 'profesor'],
    default: 'profesor'
})
role:string;

@CreateDateColumn()
  createdAt: Date


}
