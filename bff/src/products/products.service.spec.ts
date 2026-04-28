import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(() => {
    service = new ProductsService();
  });

  it('lists seeded products', () => {
    const list = service.list();
    expect(list.length).toBeGreaterThanOrEqual(5);
    expect(list[0]).toHaveProperty('priceCents');
  });

  it('returns a copy from get() so callers cannot mutate internal state', () => {
    const a = service.get('p-coffee-beans');
    a.stock = 0;
    const b = service.get('p-coffee-beans');
    expect(b.stock).toBeGreaterThan(0);
  });

  it('throws NotFound for unknown id', () => {
    expect(() => service.get('does-not-exist')).toThrow(NotFoundException);
  });

  it('reserveStockOrThrow decrements stock', () => {
    const before = service.get('p-coffee-beans').stock;
    service.reserveStockOrThrow('p-coffee-beans', 2);
    expect(service.get('p-coffee-beans').stock).toBe(before - 2);
  });

  it('reserveStockOrThrow rejects when insufficient', () => {
    expect(() => service.reserveStockOrThrow('p-tomato-sauce', 1)).toThrow(BadRequestException);
  });

  it('releaseStock returns inventory', () => {
    service.reserveStockOrThrow('p-coffee-beans', 3);
    const mid = service.get('p-coffee-beans').stock;
    service.releaseStock('p-coffee-beans', 3);
    expect(service.get('p-coffee-beans').stock).toBe(mid + 3);
  });
});
