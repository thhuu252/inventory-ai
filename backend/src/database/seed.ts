/**
 * Fills the database with demo data: users, categories, warehouses, products
 * and ~90 days of stock movements so reports and the AI assistant have something to show.
 * Usage: npm run seed  (refuses to run if products already exist, unless SEED_FORCE=1)
 */
import * as bcrypt from 'bcryptjs';
import dataSource from './data-source';
import { MovementType, Role } from '../common/enums';

const categories = ['Laptop', 'Màn hình', 'Phụ kiện', 'Linh kiện', 'Thiết bị mạng'];
const warehouses = [
  { code: 'HCM-01', name: 'Kho Thủ Đức', address: 'TP. Thủ Đức, TP.HCM' },
  { code: 'HN-01', name: 'Kho Long Biên', address: 'Long Biên, Hà Nội' },
  { code: 'DN-01', name: 'Kho Hải Châu', address: 'Hải Châu, Đà Nẵng' },
];
const products: [string, string, string, number, number, number][] = [
  // sku, name, category, price, minStock, unitsPerWeek
  ['LAP-DELL-5430', 'Laptop Dell Latitude 5430', 'Laptop', 18_500_000, 10, 6],
  ['LAP-TP-E14', 'Laptop Lenovo ThinkPad E14', 'Laptop', 16_900_000, 8, 5],
  ['LAP-MBA-M3', 'MacBook Air M3 13"', 'Laptop', 27_490_000, 5, 3],
  ['MON-DELL-P24', 'Màn hình Dell P2423 24"', 'Màn hình', 4_890_000, 15, 9],
  ['MON-LG-27UL', 'Màn hình LG 27UL500 4K', 'Màn hình', 6_790_000, 6, 4],
  ['ACC-MX-KEYS', 'Bàn phím Logitech MX Keys', 'Phụ kiện', 2_490_000, 20, 12],
  ['ACC-MX-M3S', 'Chuột Logitech MX Master 3S', 'Phụ kiện', 2_290_000, 20, 14],
  ['ACC-HUB-7IN1', 'Hub USB-C 7 in 1', 'Phụ kiện', 690_000, 30, 20],
  ['ACC-HS-JBRA', 'Tai nghe Jabra Evolve2 40', 'Phụ kiện', 2_150_000, 10, 5],
  ['CMP-RAM-16', 'RAM DDR4 16GB 3200', 'Linh kiện', 1_090_000, 25, 15],
  ['CMP-SSD-1T', 'SSD NVMe 1TB Samsung 980', 'Linh kiện', 1_890_000, 20, 11],
  ['CMP-PSU-650', 'Nguồn 650W 80 Plus Bronze', 'Linh kiện', 1_250_000, 8, 3],
  ['NET-TPL-AX55', 'Router TP-Link Archer AX55', 'Thiết bị mạng', 1_590_000, 10, 6],
  ['NET-SW-24P', 'Switch 24 port Gigabit', 'Thiết bị mạng', 2_890_000, 4, 2],
  ['NET-CAT6-305', 'Cáp mạng Cat6 thùng 305m', 'Thiết bị mạng', 1_950_000, 6, 4],
];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  await dataSource.initialize();
  await dataSource.runMigrations();
  const [{ count }] = await dataSource.query('SELECT COUNT(*)::int AS count FROM products');
  if (count > 0 && process.env.SEED_FORCE !== '1') {
    console.log('Database already has data, skipping seed (set SEED_FORCE=1 to reset).');
    return dataSource.destroy();
  }
  await dataSource.query(
    'TRUNCATE stock_movements, stock_levels, products, categories, warehouses, users RESTART IDENTITY CASCADE',
  );

  const hash = (p: string) => bcrypt.hashSync(p, 10);
  const users = await dataSource.query(
    `INSERT INTO users (email, "passwordHash", "fullName", role) VALUES
     ('admin@demo.vn', $1, 'Quản trị viên', '${Role.ADMIN}'),
     ('manager@demo.vn', $2, 'Trần Thị Quản Lý', '${Role.MANAGER}'),
     ('staff@demo.vn', $3, 'Nguyễn Văn Kho', '${Role.STAFF}')
     RETURNING id`,
    [hash('Admin@123'), hash('Manager@123'), hash('Staff@123')],
  );
  const userIds = users.map((u: { id: number }) => u.id);

  const catIds: Record<string, number> = {};
  for (const name of categories) {
    const [row] = await dataSource.query('INSERT INTO categories (name) VALUES ($1) RETURNING id', [name]);
    catIds[name] = row.id;
  }
  const whIds: number[] = [];
  for (const w of warehouses) {
    const [row] = await dataSource.query(
      'INSERT INTO warehouses (code, name, address) VALUES ($1, $2, $3) RETURNING id',
      [w.code, w.name, w.address],
    );
    whIds.push(row.id);
  }

  // Simulate 90 days: weekly receipts, near-daily issues, occasional transfers.
  const qty = new Map<string, number>();
  const key = (p: number, w: number) => `${p}:${w}`;
  const movements: unknown[][] = [];
  const now = Date.now();
  for (const [sku, name, cat, price, minStock, perWeek] of products) {
    const [row] = await dataSource.query(
      `INSERT INTO products (sku, name, "categoryId", price, "minStock") VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [sku, name, catIds[cat], price, minStock],
    );
    const pid = row.id;
    for (let day = 90; day >= 0; day--) {
      const at = new Date(now - day * 86_400_000 - rand(0, 8) * 3_600_000);
      for (const wid of whIds) {
        const k = key(pid, wid);
        let onHand = qty.get(k) ?? 0;
        if (day % 7 === 0 || onHand < perWeek / 3) {
          const n = rand(perWeek, perWeek * 2);
          onHand += n;
          movements.push([MovementType.IN, pid, wid, null, n, `PO-${at.toISOString().slice(0, 10)}`, at]);
        }
        if (Math.random() < 0.6) {
          const n = Math.min(onHand, rand(1, Math.max(1, Math.ceil(perWeek / 4))));
          if (n > 0) {
            onHand -= n;
            movements.push([MovementType.OUT, pid, wid, null, n, `SO-${rand(1000, 9999)}`, at]);
          }
        }
        qty.set(k, onHand);
      }
    }
  }
  // Make a few products deliberately low so the dashboard has alerts.
  for (const sku of ['LAP-MBA-M3', 'NET-SW-24P', 'CMP-PSU-650']) {
    const [p] = await dataSource.query('SELECT id FROM products WHERE sku = $1', [sku]);
    for (const wid of whIds) {
      const k = key(p.id, wid);
      const onHand = qty.get(k) ?? 0;
      const n = Math.max(0, onHand - 1);
      if (n > 0) {
        movements.push([MovementType.OUT, p.id, wid, null, n, `SO-${rand(1000, 9999)}`, new Date(now - 3_600_000)]);
        qty.set(k, onHand - n);
      }
    }
  }

  for (let i = 0; i < movements.length; i += 500) {
    const chunk = movements.slice(i, i + 500);
    const values = chunk
      .map((_, j) => `($${j * 8 + 1},$${j * 8 + 2},$${j * 8 + 3},$${j * 8 + 4},$${j * 8 + 5},$${j * 8 + 6},$${j * 8 + 7},$${j * 8 + 8})`)
      .join(',');
    await dataSource.query(
      `INSERT INTO stock_movements (type, "productId", "warehouseId", "toWarehouseId", quantity, "referenceCode", "createdAt", "createdById") VALUES ${values}`,
      chunk.flatMap((m) => [...m, userIds[rand(0, userIds.length - 1)]]),
    );
  }
  for (const [k, q] of qty) {
    const [pid, wid] = k.split(':').map(Number);
    await dataSource.query(
      'INSERT INTO stock_levels ("productId", "warehouseId", quantity) VALUES ($1, $2, $3)',
      [pid, wid, q],
    );
  }
  console.log(`Seeded ${products.length} products, ${movements.length} movements.`);
  console.log('Logins: admin@demo.vn / Admin@123, manager@demo.vn / Manager@123, staff@demo.vn / Staff@123');
  await dataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
