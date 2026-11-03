import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';
import { Role } from '../common/enums';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ type: 'enum', enum: Role, default: Role.STAFF })
  role: Role;

  @Column({ default: true })
  isActive: boolean;
}
