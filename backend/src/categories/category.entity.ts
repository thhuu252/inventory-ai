import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/base.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;
}
