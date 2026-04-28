import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Product } from './product.entity';
import { PRODUCT_SEED } from './products.seed';

/**
 * Stock model: a single `stock` field represents inventory available to reserve.
 * Reserve = decrement; release = increment. Held inventory is invisible to other
 * browsers, which is the desired retail behaviour. Read-modify-write is safe under
 * Node's single-threaded event loop because no `await` separates the read from the write.
 */
@Injectable()
export class ProductsService {
  private readonly products = new Map<string, Product>();

  constructor() {
    PRODUCT_SEED.forEach((p) => this.products.set(p.id, { ...p }));
  }

  list(): Product[] {
    return Array.from(this.products.values()).map((p) => ({ ...p }));
  }

  get(id: string): Product {
    const product = this.products.get(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return { ...product };
  }

  reserveStockOrThrow(id: string, quantity: number): number {
    this.assertPositiveInt(quantity);
    const product = this.products.get(id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock for ${product.name}: requested ${quantity}, available ${product.stock}`,
      );
    }
    product.stock -= quantity;
    return product.stock;
  }

  releaseStock(id: string, quantity: number): void {
    this.assertPositiveInt(quantity);
    const product = this.products.get(id);
    if (!product) return;
    product.stock += quantity;
  }

  private assertPositiveInt(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException(`quantity must be a positive integer, got ${quantity}`);
    }
  }
}
