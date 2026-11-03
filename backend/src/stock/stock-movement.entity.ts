import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MovementType } from '../common/enums';
import { Product } from '../products/product.entity';
import { Warehouse } from '../warehouses/warehouse.entity';
import { User } from '../users/user.entity';

/** Immutable ledger of every stock change. Stock levels can always be rebuilt from it. */
@Entity('stock_movements')
@Index(['productId', 'createdAt'])
@Index(['type', 'createdAt'])
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column()
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  /** Source warehouse for OUT/TRANSFER, target warehouse for IN/ADJUST. */
  @Column()
  warehouseId: number;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  /** Destination warehouse, only for TRANSFER. */
  @Column({ nullable: true })
  toWarehouseId?: number;

  @ManyToOne(() => Warehouse, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toWarehouseId' })
  toWarehouse?: Warehouse;

  /** Signed for ADJUST, always positive for the other types. */
  @Column({ type: 'int' })
  quantity: number;

  @Column({ nullable: true, length: 50 })
  referenceCode?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ nullable: true })
  createdById?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
