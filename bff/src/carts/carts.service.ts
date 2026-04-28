import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { ProductsService } from '../products/products.service';
import { Cart } from './cart.entity';

export const RESERVATION_TTL_MS = 2 * 60 * 1000; // 2 minutes
const SWEEP_INTERVAL_MS = 5_000;

@Injectable()
export class CartsService implements OnModuleDestroy {
  private readonly logger = new Logger(CartsService.name);
  private readonly carts = new Map<string, Cart>();
  private readonly sweepHandle: NodeJS.Timeout;

  constructor(private readonly products: ProductsService) {
    this.sweepHandle = setInterval(() => this.sweepExpired(), SWEEP_INTERVAL_MS);
    // Don't keep the process alive solely for the sweeper.
    this.sweepHandle.unref?.();
  }

  onModuleDestroy(): void {
    clearInterval(this.sweepHandle);
  }

  create(): Cart {
    const now = Date.now();
    const cart: Cart = {
      id: uuid(),
      status: 'active',
      lines: [],
      createdAt: now,
      lastActivityAt: now,
    };
    this.carts.set(cart.id, cart);
    return { ...cart, lines: [...cart.lines] };
  }

  get(id: string): Cart {
    this.sweepExpired();
    const cart = this.carts.get(id);
    if (!cart) throw new NotFoundException(`Cart ${id} not found`);
    return { ...cart, lines: cart.lines.map((l) => ({ ...l })) };
  }

  addItem(cartId: string, productId: string, quantity: number): Cart {
    const cart = this.requireActive(cartId);
    this.products.reserveStockOrThrow(productId, quantity);
    const existing = cart.lines.find((l) => l.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.lines.push({ productId, quantity });
    }
    this.touch(cart);
    return this.get(cartId);
  }

  updateItem(cartId: string, productId: string, quantity: number): Cart {
    const cart = this.requireActive(cartId);
    const line = cart.lines.find((l) => l.productId === productId);
    if (!line) throw new NotFoundException(`Item ${productId} not in cart`);

    if (quantity === 0) {
      this.products.releaseStock(productId, line.quantity);
      cart.lines = cart.lines.filter((l) => l.productId !== productId);
      this.touch(cart);
      return this.get(cartId);
    }

    const delta = quantity - line.quantity;
    if (delta > 0) {
      this.products.reserveStockOrThrow(productId, delta);
    } else if (delta < 0) {
      this.products.releaseStock(productId, -delta);
    }
    line.quantity = quantity;
    this.touch(cart);
    return this.get(cartId);
  }

  removeItem(cartId: string, productId: string): Cart {
    return this.updateItem(cartId, productId, 0);
  }

  /**
   * Use this when stock should return to inventory — i.e. on cart EXPIRY only. The product was
   * never sold, so the held units go back. Not called for successful checkout (see markCheckedOut).
   */
  releaseReservations(cartId: string, reason: 'expiry'): void {
    const cart = this.carts.get(cartId);
    if (!cart || cart.status !== 'active') return;
    for (const line of cart.lines) {
      this.products.releaseStock(line.productId, line.quantity);
    }
    cart.status = reason === 'expiry' ? 'expired' : 'checked_out';
  }

  /**
   * Use this on SUCCESSFUL checkout. The held stock has been "sold" — we keep the decrement
   * and just transition the cart out of the active state so it can't be mutated further.
   */
  markCheckedOut(cartId: string): void {
    const cart = this.carts.get(cartId);
    if (!cart) return;
    cart.status = 'checked_out';
  }

  /** Periodic sweep — releases reservations for any active cart idle longer than the TTL. */
  sweepExpired(now: number = Date.now()): void {
    for (const cart of this.carts.values()) {
      if (cart.status !== 'active') continue;
      if (now - cart.lastActivityAt > RESERVATION_TTL_MS) {
        this.logger.log(`Cart ${cart.id} expired — releasing ${cart.lines.length} reservations`);
        this.releaseReservations(cart.id, 'expiry');
      }
    }
  }

  private requireActive(cartId: string): Cart {
    this.sweepExpired();
    const cart = this.carts.get(cartId);
    if (!cart) throw new NotFoundException(`Cart ${cartId} not found`);
    if (cart.status !== 'active') {
      throw new BadRequestException(`Cart ${cartId} is ${cart.status}`);
    }
    return cart;
  }

  private touch(cart: Cart): void {
    cart.lastActivityAt = Date.now();
  }
}
