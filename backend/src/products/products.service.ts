import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../common/dto/pagination.dto';
import { Product } from './product.entity';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './products.dto';

export interface ProductWithStock extends Product {
  totalStock: number;
}

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private readonly repo: Repository<Product>) {}

  /**
   * Lists products with their total stock across all warehouses.
   * Stock is aggregated in a single sub-query (no per-row queries, i.e. no N+1).
   */
  async findAll(q: ProductQueryDto) {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoin(
        (sub) =>
          sub
            .select('s."productId"', 'productId')
            .addSelect('SUM(s.quantity)', 'total')
            .from('stock_levels', 's')
            .groupBy('s."productId"'),
        'st',
        'st."productId" = p.id',
      )
      .addSelect('COALESCE(st.total, 0)::int', 'totalStock');

    if (q.search) {
      qb.andWhere('(p.name ILIKE :s OR p.sku ILIKE :s)', { s: `%${q.search}%` });
    }
    if (q.categoryId) qb.andWhere('p.categoryId = :cid', { cid: q.categoryId });
    if (q.lowStock) qb.andWhere('p.isActive AND COALESCE(st.total, 0) <= p.minStock');

    const total = await qb.getCount();
    const { entities, raw } = await qb
      .orderBy('p.id', 'DESC')
      .offset(q.skip)
      .limit(q.limit)
      .getRawAndEntities();

    const stockById = new Map<number, number>(raw.map((r) => [r.p_id, Number(r.totalStock)]));
    const items: ProductWithStock[] = entities.map((p) =>
      Object.assign(p, { totalStock: stockById.get(p.id) ?? 0 }),
    );
    return paginate(items, total, q);
  }

  async findOne(id: number) {
    const product = await this.repo.findOne({ where: { id }, relations: { category: true } });
    if (!product) throw new NotFoundException('Product not found');
    const stock = await this.repo.manager
      .createQueryBuilder()
      .select(['w.id AS "warehouseId"', 'w.code AS code', 'w.name AS name', 's.quantity AS quantity'])
      .from('stock_levels', 's')
      .innerJoin('warehouses', 'w', 'w.id = s."warehouseId"')
      .where('s."productId" = :id', { id })
      .orderBy('w.code')
      .getRawMany();
    return { ...product, stock, totalStock: stock.reduce((sum, s) => sum + s.quantity, 0) };
  }

  create(dto: CreateProductDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.repo.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');
    await this.repo.save(Object.assign(product, dto));
    return this.findOne(id);
  }
}
