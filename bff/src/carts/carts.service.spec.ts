import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { CartsService, RESERVATION_TTL_MS } from './carts.service';

describe('CartsService', () => {
  let products: ProductsService;
  let carts: CartsService;

  beforeEach(() => {
    products = new ProductsService();
    carts = new CartsService(products);
  });

  afterEach(() => {
    carts.onModuleDestroy();
  });

  it('creates an empty active cart', () => {
    const cart = carts.create();
    expect(cart.status).toBe('active');
    expect(cart.lines).toEqual([]);
  });

  it('reserves stock when adding items', () => {
    const cart = carts.create();
    const before = products.get('p-coffee-beans').stock;
    carts.addItem(cart.id, 'p-coffee-beans', 2);
    expect(products.get('p-coffee-beans').stock).toBe(before - 2);
  });

  it('rejects adding more than available stock', () => {
    const cart = carts.create();
    expect(() => carts.addItem(cart.id, 'p-tomato-sauce', 1)).toThrow(BadRequestException);
  });

  it('combines quantities when the same product is added twice', () => {
    const cart = carts.create();
    carts.addItem(cart.id, 'p-coffee-beans', 1);
    const updated = carts.addItem(cart.id, 'p-coffee-beans', 2);
    expect(updated.lines).toHaveLength(1);
    expect(updated.lines[0].quantity).toBe(3);
  });

  it('releases stock when the line is removed', () => {
    const cart = carts.create();
    const before = products.get('p-coffee-beans').stock;
    carts.addItem(cart.id, 'p-coffee-beans', 2);
    carts.removeItem(cart.id, 'p-coffee-beans');
    expect(products.get('p-coffee-beans').stock).toBe(before);
  });

  it('updateItem reconciles delta against inventory', () => {
    const cart = carts.create();
    carts.addItem(cart.id, 'p-coffee-beans', 2);
    const beforeRaise = products.get('p-coffee-beans').stock;
    carts.updateItem(cart.id, 'p-coffee-beans', 5);
    expect(products.get('p-coffee-beans').stock).toBe(beforeRaise - 3);
    carts.updateItem(cart.id, 'p-coffee-beans', 1);
    expect(products.get('p-coffee-beans').stock).toBe(beforeRaise + 1);
  });

  it('expires carts after TTL of inactivity and releases reservations', () => {
    const cart = carts.create();
    carts.addItem(cart.id, 'p-coffee-beans', 2);
    const reservedAt = products.get('p-coffee-beans').stock;
    const future = Date.now() + RESERVATION_TTL_MS + 1000;
    carts.sweepExpired(future);
    expect(products.get('p-coffee-beans').stock).toBe(reservedAt + 2);
    expect(() => carts.addItem(cart.id, 'p-coffee-beans', 1)).toThrow(BadRequestException);
  });

  it('throws NotFound for unknown cart', () => {
    expect(() => carts.get('nope')).toThrow(NotFoundException);
  });
});
