import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AI_TOOLS } from '../src/ai/ai.tools';
import { AppModule } from '../src/app.module';
import { ReportsService } from '../src/reports/reports.service';
import { setupApp } from '../src/setup-app';

describe('Inventory API (e2e)', () => {
  let app: INestApplication;
  let staff: string;
  let manager: string;
  let wh1: number;
  let wh2: number;
  let productId: number;

  const api = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = async (email: string, password: string) =>
    (await api().post('/api/auth/login').send({ email, password }).expect(200)).body.accessToken as string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = setupApp(moduleRef.createNestApplication());
    await app.init();

    const db = app.get(DataSource);
    await db.query(
      'TRUNCATE stock_movements, stock_levels, products, categories, warehouses, users RESTART IDENTITY CASCADE',
    );
    const hash = await bcrypt.hash('Passw0rd!', 4);
    await db.query(
      `INSERT INTO users (email, "passwordHash", "fullName", role) VALUES
       ('staff@test.vn', $1, 'Staff', 'STAFF'), ('manager@test.vn', $1, 'Manager', 'MANAGER')`,
      [hash],
    );
    staff = await login('staff@test.vn', 'Passw0rd!');
    manager = await login('manager@test.vn', 'Passw0rd!');
  });

  afterAll(() => app.close());

  it('rejects requests without a token and wrong passwords', async () => {
    await api().get('/api/products').expect(401);
    await api().post('/api/auth/login').send({ email: 'staff@test.vn', password: 'nope' }).expect(401);
  });

  it('lets managers create master data but not staff', async () => {
    await api().post('/api/warehouses').set(as(staff)).send({ code: 'X-01', name: 'x' }).expect(403);
    wh1 = (await api().post('/api/warehouses').set(as(manager)).send({ code: 'HCM-01', name: 'HCM' }).expect(201))
      .body.id;
    wh2 = (await api().post('/api/warehouses').set(as(manager)).send({ code: 'HN-01', name: 'HN' }).expect(201))
      .body.id;
    productId = (
      await api()
        .post('/api/products')
        .set(as(manager))
        .send({ sku: 'SKU-1', name: 'Test product', price: 100000, minStock: 5 })
        .expect(201)
    ).body.id;
  });

  it('validates input and rejects duplicates', async () => {
    await api()
      .post('/api/stock/in')
      .set(as(staff))
      .send({ warehouseId: wh1, items: [{ productId, quantity: -3 }] })
      .expect(400);
    await api().post('/api/products').set(as(manager)).send({ sku: 'SKU-1', name: 'duplicate' }).expect(409);
  });

  it('receives, issues and transfers stock', async () => {
    await api()
      .post('/api/stock/in')
      .set(as(staff))
      .send({
        warehouseId: wh1,
        referenceCode: 'PO-1',
        items: [
          { productId, quantity: 10 },
          { productId, quantity: 5 },
        ],
      })
      .expect(201);
    await api()
      .post('/api/stock/out')
      .set(as(staff))
      .send({ warehouseId: wh1, items: [{ productId, quantity: 4 }] })
      .expect(201);
    await api()
      .post('/api/stock/transfer')
      .set(as(staff))
      .send({ fromWarehouseId: wh1, toWarehouseId: wh2, items: [{ productId, quantity: 3 }] })
      .expect(201);

    const res = await api().get(`/api/products/${productId}`).set(as(staff)).expect(200);
    expect(res.body.totalStock).toBe(11);
    expect(res.body.stock.map((s: { code: string; quantity: number }) => [s.code, s.quantity])).toEqual([
      ['HCM-01', 8],
      ['HN-01', 3],
    ]);
  });

  it('refuses to issue more than available and rolls back the whole document', async () => {
    const res = await api()
      .post('/api/stock/out')
      .set(as(staff))
      .send({ warehouseId: wh2, items: [{ productId, quantity: 4 }] })
      .expect(400);
    expect(res.body.message).toMatch(/available 3, requested 4/);
    const p = await api().get(`/api/products/${productId}`).set(as(staff));
    expect(p.body.totalStock).toBe(11);
  });

  it('never goes negative under concurrent issues', async () => {
    // 8 units in HCM-01; 10 parallel requests of 1 unit each -> exactly 8 succeed.
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        api()
          .post('/api/stock/out')
          .set(as(staff))
          .send({ warehouseId: wh1, items: [{ productId, quantity: 1 }] }),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(8);
    expect(results.filter((r) => r.status === 400)).toHaveLength(2);
    const p = await api().get(`/api/products/${productId}`).set(as(staff));
    expect(p.body.stock.find((s: { code: string }) => s.code === 'HCM-01').quantity).toBe(0);
  });

  it('only lets managers adjust stock', async () => {
    const body = { warehouseId: wh2, productId, quantity: -1, note: 'damaged' };
    await api().post('/api/stock/adjust').set(as(staff)).send(body).expect(403);
    await api().post('/api/stock/adjust').set(as(manager)).send(body).expect(201);
  });

  it('reports low stock and movement history', async () => {
    const low = await api().get('/api/products?lowStock=true').set(as(staff)).expect(200);
    expect(low.body.items.map((p: { sku: string }) => p.sku)).toEqual(['SKU-1']);
    const mv = await api().get('/api/stock/movements?type=OUT').set(as(staff)).expect(200);
    expect(mv.body.total).toBe(9);
    const summary = await api().get('/api/reports/summary').set(as(staff)).expect(200);
    expect(summary.body).toMatchObject({ activeProducts: 1, totalUnits: 2, lowStockCount: 1 });
  });

  it('runs every AI tool against the real database', async () => {
    const reports = app.get(ReportsService);
    const today = new Date().toISOString().slice(0, 10);
    const args: Record<string, Record<string, unknown>> = {
      search_products: { query: 'test' },
      get_movement_totals: { from: today, to: today, productSku: 'SKU-1' },
    };
    for (const tool of AI_TOOLS) {
      await expect(tool.run(reports, args[tool.name] ?? {})).resolves.toBeDefined();
    }
    const found = (await AI_TOOLS.find((t) => t.name === 'search_products')!.run(reports, {
      query: 'SKU-1',
    })) as { totalStock: number }[];
    expect(found[0].totalStock).toBe(2);
  });

  it('returns 503 from the assistant when no API key is set', async () => {
    await api().post('/api/ai/ask').set(as(staff)).send({ question: 'tồn kho?' }).expect(503);
  });
});
