import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Cart } from './cart.entity';
import { CartsService } from './carts.service';
import { AddItemDto, UpdateItemDto } from './dto';

@Controller('carts')
export class CartsController {
  constructor(private readonly carts: CartsService) {}

  @Post()
  create(): Cart {
    return this.carts.create();
  }

  @Get(':id')
  get(@Param('id') id: string): Cart {
    return this.carts.get(id);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() body: AddItemDto): Cart {
    return this.carts.addItem(id, body.productId, body.quantity);
  }

  @Patch(':id/items/:productId')
  updateItem(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body() body: UpdateItemDto,
  ): Cart {
    return this.carts.updateItem(id, productId, body.quantity);
  }

  @Delete(':id/items/:productId')
  removeItem(@Param('id') id: string, @Param('productId') productId: string): Cart {
    return this.carts.removeItem(id, productId);
  }
}
