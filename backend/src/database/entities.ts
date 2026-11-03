import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';
import { Warehouse } from '../warehouses/warehouse.entity';
import { StockLevel } from '../stock/stock-level.entity';
import { StockMovement } from '../stock/stock-movement.entity';

export const entities = [User, Category, Product, Warehouse, StockLevel, StockMovement];
