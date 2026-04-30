// Input:  HTTP requests to /api/v1/posts (mirrors Rails resource routes)
// Output: JSON responses with validation, auth guards, pagination

// src/posts/posts.module.ts
import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}

// src/posts/posts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePostDto, authorId: number) {
    return this.prisma.post.create({
      data: { ...dto, authorId },
      include: { author: true },
    });
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: { published: true },
        include: { author: { select: { id: true, name: true, email: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where: { published: true } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { author: true },
    });
    if (!post) throw new NotFoundException(`Post #${id} not found`);
    return post;
  }

  async update(id: number, dto: UpdatePostDto) {
    await this.findOne(id); // throws if not found
    return this.prisma.post.update({
      where: { id },
      data: dto,
      include: { author: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.post.delete({ where: { id } });
  }
}
