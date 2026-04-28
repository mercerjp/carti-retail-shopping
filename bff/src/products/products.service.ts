import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Product } from './product.entity';
import { PRODUCT_SEED } from './products.seed';

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

  /**
   * Atomically reserve stock. Throws BadRequestException on insufficient stock so callers
   * get a clean 400 with the product name in the message.
   */
  reserveStockOrThrow(id: string, quantity: number): number {
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

  /** Release previously reserved stock back to available inventory. */
  releaseStock(id: string, quantity: number): void {
    const product = this.products.get(id);
    if (!product) return;
    product.stock += quantity;
  }
}
