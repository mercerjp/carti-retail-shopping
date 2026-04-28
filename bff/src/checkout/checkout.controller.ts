import { Controller, Param, Post } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { OrderSummary } from './order.entity';

@Controller('carts')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post(':id/checkout')
  doCheckout(@Param('id') id: string): OrderSummary {
    return this.checkout.checkout(id);
  }
}
