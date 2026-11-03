import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { CreateWarehouseDto, UpdateWarehouseDto } from './warehouses.dto';

@Injectable()
export class WarehousesService {
  constructor(@InjectRepository(Warehouse) private readonly repo: Repository<Warehouse>) {}

  /** Warehouses with the number of distinct products and total units on hand. */
  findAll() {
    return this.repo
      .createQueryBuilder('w')
      .leftJoin('stock_levels', 's', 's."warehouseId" = w.id AND s.quantity > 0')
      .select(['w.id AS id', 'w.code AS code', 'w.name AS name', 'w.address AS address', 'w."isActive" AS "isActive"'])
      .addSelect('COUNT(s.id)::int', 'productCount')
      .addSelect('COALESCE(SUM(s.quantity), 0)::int', 'totalUnits')
      .groupBy('w.id')
      .orderBy('w.code')
      .getRawMany();
  }

  async findOne(id: number) {
    const w = await this.repo.findOneBy({ id });
    if (!w) throw new NotFoundException('Warehouse not found');
    return w;
  }

  create(dto: CreateWarehouseDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateWarehouseDto) {
    const w = await this.findOne(id);
    return this.repo.save(Object.assign(w, dto));
  }
}
