import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity, decimalTransformer } from '../common/base.entity';
import { Category } from '../categories/category.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 50 })
  sku: string;

  @Index()
  @Column()
  name: string;

  @Column({ length: 20, default: 'pcs' })
  unit: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, transformer: decimalTransformer })
  price: number;

  /** Alert threshold: total stock at or below this level is reported as "low stock". */
  @Column({ type: 'int', default: 0 })
  minStock: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  categoryId?: number;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category?: Category;
}
