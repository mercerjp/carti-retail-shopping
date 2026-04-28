import { Controller, Get, Param } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { Discount } from './discount.entity';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Get()
  list(): Discount[] {
    return this.discounts.list();
  }

  @Get(':id')
  get(@Param('id') id: string): Discount {
    return this.discounts.get(id);
  }
}
