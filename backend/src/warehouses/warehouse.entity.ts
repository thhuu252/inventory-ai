import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('warehouses')
export class Warehouse extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 20 })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ default: true })
  isActive: boolean;
}
