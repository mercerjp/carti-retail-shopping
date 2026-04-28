import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

describe('Retail BFF (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/products returns the catalogue', async () => {
    const res = await request(app.getHttpServer()).get('/api/products').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(5);
  });

  it('GET /api/discounts returns active discounts', async () => {
    const res = await request(app.getHttpServer()).get('/api/discounts').expect(200);
    expect(res.body.every((d: { active: boolean }) => d.active)).toBe(true);
  });

  it('completes a happy-path cart -> checkout flow', async () => {
    const server = app.getHttpServer();

    const cart = (await request(server).post('/api/carts').expect(201)).body;
    expect(cart.id).toBeDefined();

    await request(server)
      .post(`/api/carts/${cart.id}/items`)
      .send({ productId: 'p-coffee-beans', quantity: 1 })
      .expect(201);

    await request(server)
      .post(`/api/carts/${cart.id}/items`)
      .send({ productId: 'p-oat-milk', quantity: 3 })
      .expect(201);

    const order = (
      await request(server).post(`/api/carts/${cart.id}/checkout`).expect(201)
    ).body;

    expect(order.orderId).toBeDefined();
    expect(order.lines).toHaveLength(2);
    expect(order.discountTotalCents).toBeGreaterThan(0);
    expect(order.totalCents).toBeLessThan(order.subtotalCents);
  });

  it('returns 400 when adding out-of-stock item', async () => {
    const server = app.getHttpServer();
    const cart = (await request(server).post('/api/carts').expect(201)).body;
    const res = await request(server)
      .post(`/api/carts/${cart.id}/items`)
      .send({ productId: 'p-tomato-sauce', quantity: 1 })
      .expect(400);
    expect(res.body.message).toMatch(/Insufficient stock/);
  });

  it('returns 400 when checking out an empty cart', async () => {
    const server = app.getHttpServer();
    const cart = (await request(server).post('/api/carts').expect(201)).body;
    const res = await request(server).post(`/api/carts/${cart.id}/checkout`).expect(400);
    expect(res.body.message).toMatch(/empty/i);
  });
});
