import { Controller, Get, Param } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './product.entity';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(): Product[] {
    return this.products.list();
  }

  @Get(':id')
  get(@Param('id') id: string): Product {
    return this.products.get(id);
  }
}
