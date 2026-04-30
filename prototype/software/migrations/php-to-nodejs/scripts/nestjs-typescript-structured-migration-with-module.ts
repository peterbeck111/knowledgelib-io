// Input:  A PHP Symfony/Laravel controller with DI, services, and repositories
// Output: NestJS equivalent with the same architectural patterns

// src/products/products.module.ts
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}

// src/products/products.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '../auth/auth.guard';

// PHP equivalent: class ProductController extends Controller { ... }
@Controller('api/products')
export class ProductsController {
  // PHP equivalent: public function __construct(private ProductService $service) {}
  constructor(private readonly productsService: ProductsService) {}

  // PHP: public function index(Request $request) { return Product::paginate(20); }
  @Get()
  findAll(@Query('page') page = '1', @Query('category') category?: string) {
    return this.productsService.findAll({ page: Number(page), category });
  }

  // PHP: public function store(StoreProductRequest $request) { return Product::create($request->validated()); }
  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: { name: string; price: number; category?: string }) {
    return this.productsService.create(body);
  }
}

// src/products/products.service.ts
import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';

// PHP equivalent: class ProductService { public function __construct(private ProductRepository $repo) {} }
@Injectable()
export class ProductsService {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  async findAll({ page, category }: { page: number; category?: string }) {
    let query = this.knex('products').select('*');
    if (category) query = query.where('category', category);
    const limit = 20;
    const offset = (page - 1) * limit;
    const data = await query.limit(limit).offset(offset);
    return { data, meta: { page, limit } };
  }

  async create(product: { name: string; price: number; category?: string }) {
    const [created] = await this.knex('products').insert(product).returning('*');
    return { data: created };
  }
}
