import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MovementType } from '../common/enums';

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(Math.trunc(n) || min, min), max);

/**
 * Read-only analytics. Every method here is also exposed to the AI assistant as a tool,
 * so they all take simple, validated parameters and never run caller-supplied SQL.
 */
@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async summary() {
    const [row] = await this.db.query(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE "isActive")::int AS "activeProducts",
        (SELECT COUNT(*) FROM warehouses WHERE "isActive")::int AS "activeWarehouses",
        (SELECT COALESCE(SUM(quantity), 0) FROM stock_levels)::int AS "totalUnits",
        (SELECT COALESCE(SUM(s.quantity * p.price), 0)
           FROM stock_levels s JOIN products p ON p.id = s."productId")::float AS "stockValue",
        (SELECT COUNT(*) FROM stock_movements WHERE "createdAt" >= date_trunc('day', now()))::int AS "movementsToday"
    `);
    const lowStock = await this.lowStock(1000);
    return { ...row, lowStockCount: lowStock.length };
  }

  /** Active products whose total stock is at or below their minimum. */
  lowStock(limit = 20) {
    return this.db.query(
      `SELECT p.id, p.sku, p.name, p.unit, p."minStock", COALESCE(SUM(s.quantity), 0)::int AS "totalStock"
       FROM products p
       LEFT JOIN stock_levels s ON s."productId" = p.id
       WHERE p."isActive"
       GROUP BY p.id
       HAVING COALESCE(SUM(s.quantity), 0) <= p."minStock"
       ORDER BY COALESCE(SUM(s.quantity), 0) - p."minStock", p.sku
       LIMIT $1`,
      [clamp(limit, 1, 1000)],
    );
  }

  /** Units received (IN) and issued (OUT) per day, including days with no activity. */
  movementTrend(days = 30) {
    return this.db.query(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(m.quantity) FILTER (WHERE m.type = 'IN'), 0)::int AS "in",
              COALESCE(SUM(m.quantity) FILTER (WHERE m.type = 'OUT'), 0)::int AS "out"
       FROM generate_series(date_trunc('day', now()) - ($1::int - 1) * INTERVAL '1 day',
                            date_trunc('day', now()), INTERVAL '1 day') AS d(day)
       LEFT JOIN stock_movements m ON date_trunc('day', m."createdAt") = d.day
       GROUP BY d.day ORDER BY d.day`,
      [clamp(days, 1, 365)],
    );
  }

  /** Products ranked by quantity moved (default: best sellers by OUT) over the last N days. */
  topProducts(type: MovementType = MovementType.OUT, days = 30, limit = 5) {
    return this.db.query(
      `SELECT p.id, p.sku, p.name, p.unit, SUM(m.quantity)::int AS quantity, COUNT(*)::int AS "movementCount"
       FROM stock_movements m JOIN products p ON p.id = m."productId"
       WHERE m.type = $1 AND m."createdAt" >= now() - $2::int * INTERVAL '1 day'
       GROUP BY p.id ORDER BY quantity DESC LIMIT $3`,
      [type, clamp(days, 1, 365), clamp(limit, 1, 50)],
    );
  }

  stockByWarehouse() {
    return this.db.query(
      `SELECT w.id, w.code, w.name,
              COALESCE(SUM(s.quantity), 0)::int AS "totalUnits",
              COALESCE(SUM(s.quantity * p.price), 0)::float AS "stockValue"
       FROM warehouses w
       LEFT JOIN stock_levels s ON s."warehouseId" = w.id
       LEFT JOIN products p ON p.id = s."productId"
       WHERE w."isActive"
       GROUP BY w.id ORDER BY "stockValue" DESC`,
    );
  }

  /** Free-text product lookup with per-warehouse stock; used by the AI assistant. */
  searchProducts(query: string, limit = 10) {
    return this.db.query(
      `SELECT p.id, p.sku, p.name, p.unit, p.price::float, p."minStock",
              c.name AS category,
              COALESCE(SUM(s.quantity), 0)::int AS "totalStock",
              COALESCE(json_agg(json_build_object('warehouse', w.code, 'quantity', s.quantity))
                       FILTER (WHERE s.id IS NOT NULL), '[]') AS "byWarehouse"
       FROM products p
       LEFT JOIN categories c ON c.id = p."categoryId"
       LEFT JOIN stock_levels s ON s."productId" = p.id
       LEFT JOIN warehouses w ON w.id = s."warehouseId"
       WHERE p.name ILIKE $1 OR p.sku ILIKE $1 OR c.name ILIKE $1
       GROUP BY p.id, c.name ORDER BY p.name LIMIT $2`,
      [`%${query}%`, clamp(limit, 1, 50)],
    );
  }

  /** Totals of movements in a date range, optionally for one product or warehouse. */
  async movementTotals(params: { from: string; to: string; productSku?: string; warehouseCode?: string }) {
    const rows = await this.db.query(
      `SELECT m.type, SUM(m.quantity)::int AS quantity, COUNT(*)::int AS "movementCount",
              COALESCE(SUM(m.quantity * p.price), 0)::float AS value
       FROM stock_movements m
       JOIN products p ON p.id = m."productId"
       JOIN warehouses w ON w.id = m."warehouseId"
       WHERE m."createdAt" >= $1::date AND m."createdAt" < $2::date + INTERVAL '1 day'
         AND ($3::text IS NULL OR p.sku ILIKE $3)
         AND ($4::text IS NULL OR w.code ILIKE $4)
       GROUP BY m.type`,
      [params.from, params.to, params.productSku ?? null, params.warehouseCode ?? null],
    );
    return { ...params, totals: rows };
  }
}
