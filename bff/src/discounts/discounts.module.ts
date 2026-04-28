import { Module } from '@nestjs/common';
import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';
import { DiscountEngine } from './discount-engine';

@Module({
  controllers: [DiscountsController],
  providers: [DiscountsService, DiscountEngine],
  exports: [DiscountsService, DiscountEngine],
})
export class DiscountsModule {}
