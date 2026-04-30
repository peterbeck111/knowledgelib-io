// Input:  A bounded context extracted as a NestJS microservice
// Output: Service that consumes domain events from the monolith via RabbitMQ

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Module, Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

// Domain event handler — consumes events from monolith
@Controller()
class OrderEventController {
  @EventPattern('order.placed')
  async handleOrderPlaced(@Payload() data: {
    orderId: string;
    userId: string;
    items: Array<{ productId: string; quantity: number }>;
  }) {
    console.log(`Processing order ${data.orderId}`);
    // Inventory reservation logic (owned by this service)
    for (const item of data.items) {
      await this.reserveStock(item.productId, item.quantity);
    }
  }

  @EventPattern('order.cancelled')
  async handleOrderCancelled(@Payload() data: { orderId: string }) {
    console.log(`Releasing stock for order ${data.orderId}`);
    await this.releaseReservation(data.orderId);
  }

  private async reserveStock(productId: string, qty: number): Promise<void> {
    // Update inventory in this service's own database
    // Throws if insufficient stock
  }

  private async releaseReservation(orderId: string): Promise<void> {
    // Release previously reserved stock
  }
}

@Module({ controllers: [OrderEventController] })
class InventoryModule {}

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    InventoryModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
        queue: 'inventory_queue',
        queueOptions: { durable: true },
      },
    },
  );
  await app.listen();
  console.log('Inventory microservice is listening');
}
bootstrap();
