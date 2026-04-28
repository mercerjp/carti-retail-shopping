import { Module } from '@nestjs/common';
import { CartsModule } from '../carts/carts.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { ProductsModule } from '../products/products.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [CartsModule, ProductsModule, DiscountsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
