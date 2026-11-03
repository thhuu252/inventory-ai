import { MovementType } from '../common/enums';
import { ReportsService } from '../reports/reports.service';

export interface AiTool {
  name: string;
  description: string;
  /** JSON Schema for the arguments; sent to the model as-is. */
  parameters: Record<string, unknown>;
  run: (reports: ReportsService, args: Record<string, any>) => Promise<unknown>;
}

const isoDate = { type: 'string', description: 'Date in YYYY-MM-DD format' };

/**
 * The assistant can only call these read-only functions. It never writes SQL itself,
 * so a prompt-injection attempt cannot modify or dump the database.
 */
export const AI_TOOLS: AiTool[] = [
  {
    name: 'get_inventory_summary',
    description:
      'Overall figures: number of active products and warehouses, total units in stock, total stock value (VND), number of low-stock products, movements today.',
    parameters: { type: 'object', properties: {} },
    run: (r) => r.summary(),
  },
  {
    name: 'search_products',
    description:
      'Find products by name, SKU or category, with price, total stock and stock per warehouse. Use for any question about a specific product.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword: part of the product name, SKU or category' },
        limit: { type: 'integer', description: 'Max results, default 10' },
      },
      required: ['query'],
    },
    run: (r, a) => r.searchProducts(String(a.query ?? ''), a.limit),
  },
  {
    name: 'get_low_stock_products',
    description: 'Products whose total stock is at or below their minimum stock level (need reordering).',
    parameters: {
      type: 'object',
      properties: { limit: { type: 'integer', description: 'Max results, default 20' } },
    },
    run: (r, a) => r.lowStock(a.limit ?? 20),
  },
  {
    name: 'get_top_products',
    description:
      'Products ranked by quantity moved in the last N days. type=OUT gives best sellers / most used, type=IN gives most received.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: [MovementType.IN, MovementType.OUT] },
        days: { type: 'integer', description: 'Look-back window in days, default 30' },
        limit: { type: 'integer', description: 'Default 5' },
      },
    },
    run: (r, a) => r.topProducts(a.type === MovementType.IN ? MovementType.IN : MovementType.OUT, a.days ?? 30, a.limit ?? 5),
  },
  {
    name: 'get_movement_totals',
    description:
      'Total quantity and value received (IN), issued (OUT), transferred and adjusted in a date range, optionally filtered by product SKU or warehouse code.',
    parameters: {
      type: 'object',
      properties: {
        from: isoDate,
        to: isoDate,
        productSku: { type: 'string' },
        warehouseCode: { type: 'string' },
      },
      required: ['from', 'to'],
    },
    run: (r, a) =>
      r.movementTotals({ from: a.from, to: a.to, productSku: a.productSku, warehouseCode: a.warehouseCode }),
  },
  {
    name: 'get_daily_movement_trend',
    description: 'Units received (in) and issued (out) per day for the last N days.',
    parameters: {
      type: 'object',
      properties: { days: { type: 'integer', description: 'Default 14, max 365' } },
    },
    run: (r, a) => r.movementTrend(a.days ?? 14),
  },
  {
    name: 'get_stock_by_warehouse',
    description: 'Total units and stock value (VND) for each warehouse.',
    parameters: { type: 'object', properties: {} },
    run: (r) => r.stockByWarehouse(),
  },
];
