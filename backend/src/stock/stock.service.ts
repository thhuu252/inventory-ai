import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { paginate } from '../common/dto/pagination.dto';
import { MovementType } from '../common/enums';
import { Product } from '../products/product.entity';
import { Warehouse } from '../warehouses/warehouse.entity';
import { StockLevel } from './stock-level.entity';
import { StockMovement } from './stock-movement.entity';
import {
  MovementQueryDto,
  StockAdjustDto,
  StockInOutDto,
  StockLevelQueryDto,
  StockLineDto,
  StockTransferDto,
} from './stock.dto';

export class InsufficientStockError extends BadRequestException {}

@Injectable()
export class StockService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  receive(dto: StockInOutDto, userId: number) {
    return this.dataSource.transaction(async (em) => {
      await this.assertWarehouses(em, [dto.warehouseId]);
      const lines = await this.normalizeLines(em, dto.items);
      const ref = dto.referenceCode ?? this.generateRef(MovementType.IN);
      for (const line of lines) {
        await this.changeQuantity(em, line.productId, dto.warehouseId, line.quantity);
      }
      return this.saveMovements(em, lines, {
        type: MovementType.IN,
        warehouseId: dto.warehouseId,
        referenceCode: ref,
        note: dto.note,
        createdById: userId,
      });
    });
  }

  issue(dto: StockInOutDto, userId: number) {
    return this.dataSource.transaction(async (em) => {
      await this.assertWarehouses(em, [dto.warehouseId]);
      const lines = await this.normalizeLines(em, dto.items);
      const ref = dto.referenceCode ?? this.generateRef(MovementType.OUT);
      for (const line of lines) {
        await this.changeQuantity(em, line.productId, dto.warehouseId, -line.quantity);
      }
      return this.saveMovements(em, lines, {
        type: MovementType.OUT,
        warehouseId: dto.warehouseId,
        referenceCode: ref,
        note: dto.note,
        createdById: userId,
      });
    });
  }

  transfer(dto: StockTransferDto, userId: number) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must differ');
    }
    return this.dataSource.transaction(async (em) => {
      await this.assertWarehouses(em, [dto.fromWarehouseId, dto.toWarehouseId]);
      const lines = await this.normalizeLines(em, dto.items);
      const ref = dto.referenceCode ?? this.generateRef(MovementType.TRANSFER);
      for (const line of lines) {
        await this.changeQuantity(em, line.productId, dto.fromWarehouseId, -line.quantity);
        await this.changeQuantity(em, line.productId, dto.toWarehouseId, line.quantity);
      }
      return this.saveMovements(em, lines, {
        type: MovementType.TRANSFER,
        warehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        referenceCode: ref,
        note: dto.note,
        createdById: userId,
      });
    });
  }

  adjust(dto: StockAdjustDto, userId: number) {
    return this.dataSource.transaction(async (em) => {
      await this.assertWarehouses(em, [dto.warehouseId]);
      await this.normalizeLines(em, [{ productId: dto.productId, quantity: 1 }]);
      await this.changeQuantity(em, dto.productId, dto.warehouseId, dto.quantity);
      return this.saveMovements(em, [{ productId: dto.productId, quantity: dto.quantity }], {
        type: MovementType.ADJUST,
        warehouseId: dto.warehouseId,
        referenceCode: this.generateRef(MovementType.ADJUST),
        note: dto.note,
        createdById: userId,
      });
    });
  }

  async findMovements(q: MovementQueryDto) {
    const qb = this.dataSource
      .getRepository(StockMovement)
      .createQueryBuilder('m')
      .leftJoin('m.product', 'p')
      .addSelect(['p.id', 'p.sku', 'p.name', 'p.unit'])
      .leftJoin('m.warehouse', 'w')
      .addSelect(['w.id', 'w.code', 'w.name'])
      .leftJoin('m.toWarehouse', 'tw')
      .addSelect(['tw.id', 'tw.code', 'tw.name'])
      .leftJoin('m.createdBy', 'u')
      .addSelect(['u.id', 'u.fullName']);
    if (q.type) qb.andWhere('m.type = :type', { type: q.type });
    if (q.productId) qb.andWhere('m.productId = :pid', { pid: q.productId });
    if (q.warehouseId) {
      qb.andWhere('(m.warehouseId = :wid OR m.toWarehouseId = :wid)', { wid: q.warehouseId });
    }
    if (q.from) qb.andWhere('m.createdAt >= :from', { from: q.from });
    if (q.to) qb.andWhere("m.createdAt < (:to::date + INTERVAL '1 day')", { to: q.to });
    if (q.search) {
      qb.andWhere('(m.referenceCode ILIKE :s OR p.name ILIKE :s OR p.sku ILIKE :s)', {
        s: `%${q.search}%`,
      });
    }
    const [items, total] = await qb
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .skip(q.skip)
      .take(q.limit)
      .getManyAndCount();
    return paginate(items, total, q);
  }

  async findLevels(q: StockLevelQueryDto) {
    const qb = this.dataSource
      .getRepository(StockLevel)
      .createQueryBuilder('s')
      .innerJoin('s.product', 'p')
      .addSelect(['p.id', 'p.sku', 'p.name', 'p.unit', 'p.minStock'])
      .innerJoin('s.warehouse', 'w')
      .addSelect(['w.id', 'w.code', 'w.name']);
    if (q.warehouseId) qb.andWhere('s.warehouseId = :wid', { wid: q.warehouseId });
    if (q.search) qb.andWhere('(p.name ILIKE :s OR p.sku ILIKE :s)', { s: `%${q.search}%` });
    const [items, total] = await qb
      .orderBy('w.code')
      .addOrderBy('p.sku')
      .skip(q.skip)
      .take(q.limit)
      .getManyAndCount();
    return paginate(items, total, q);
  }

  /**
   * Atomically adds `delta` to a stock level.
   * Decreases use a conditional UPDATE (`quantity >= n`), so two concurrent issues
   * can never push stock below zero, without needing an explicit row lock.
   */
  private async changeQuantity(em: EntityManager, productId: number, warehouseId: number, delta: number) {
    if (delta > 0) {
      await em.query(
        `INSERT INTO stock_levels ("productId", "warehouseId", quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT ("productId", "warehouseId")
         DO UPDATE SET quantity = stock_levels.quantity + EXCLUDED.quantity, "updatedAt" = now()`,
        [productId, warehouseId, delta],
      );
      return;
    }
    const [rows] = await em.query(
      `UPDATE stock_levels SET quantity = quantity - $3, "updatedAt" = now()
       WHERE "productId" = $1 AND "warehouseId" = $2 AND quantity >= $3
       RETURNING quantity`,
      [productId, warehouseId, -delta],
    );
    if (!rows?.length) {
      const level = await em.findOne(StockLevel, { where: { productId, warehouseId } });
      const product = await em.findOneBy(Product, { id: productId });
      throw new InsufficientStockError(
        `Insufficient stock for ${product?.sku ?? productId}: available ${level?.quantity ?? 0}, requested ${-delta}`,
      );
    }
  }

  /** Validates products and merges duplicate lines (same product twice in one document). */
  private async normalizeLines(em: EntityManager, items: StockLineDto[]) {
    const merged = new Map<number, number>();
    for (const i of items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.quantity);
    const ids = [...merged.keys()];
    const products = await em.findBy(Product, { id: In(ids) });
    const missing = ids.filter((id) => !products.some((p) => p.id === id && p.isActive));
    if (missing.length) throw new NotFoundException(`Products not found or inactive: ${missing.join(', ')}`);
    // Sorted so concurrent documents touch rows in the same order (avoids deadlocks).
    return ids.sort((a, b) => a - b).map((productId) => ({ productId, quantity: merged.get(productId)! }));
  }

  private async assertWarehouses(em: EntityManager, ids: number[]) {
    const found = await em.findBy(Warehouse, { id: In(ids), isActive: true });
    if (found.length !== new Set(ids).size) throw new NotFoundException('Warehouse not found or inactive');
  }

  private saveMovements(
    em: EntityManager,
    lines: { productId: number; quantity: number }[],
    base: Partial<StockMovement>,
  ) {
    return em.save(
      StockMovement,
      lines.map((l) => em.create(StockMovement, { ...base, ...l })),
    );
  }

  private generateRef(type: MovementType) {
    const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${type}-${d}-${rand}`;
  }
}
