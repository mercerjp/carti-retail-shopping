import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { DiscountsModule } from './discounts/discounts.module';
import { CartsModule } from './carts/carts.module';
import { CheckoutModule } from './checkout/checkout.module';

@Module({
  imports: [ProductsModule, DiscountsModule, CartsModule, CheckoutModule],
})
export class AppModule {}
