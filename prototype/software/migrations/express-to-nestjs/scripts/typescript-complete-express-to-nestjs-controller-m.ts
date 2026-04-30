// Input:  Express route file with CRUD operations, middleware, and validation
// Output: Equivalent NestJS module with controller, service, DTO, and guard

// --- Express original (routes/products.js) ---
// const router = express.Router();
// router.get('/', async (req, res) => { ... });
// router.post('/', authMiddleware, validateProduct, async (req, res) => { ... });
// router.put('/:id', authMiddleware, validateProduct, async (req, res) => { ... });
// router.delete('/:id', authMiddleware, async (req, res) => { ... });

// --- NestJS equivalent ---

// products/dto/create-product.dto.ts
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  description?: string;
}

// products/products.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.productsService.findAll(page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}

// products/products.module.ts
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
