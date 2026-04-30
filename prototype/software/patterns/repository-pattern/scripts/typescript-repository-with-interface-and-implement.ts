// Interface — domain layer (no ORM imports)
interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findByCustomer(customerId: string): Promise<Order[]>;
  save(order: Order): Promise<void>;
}

// Implementation — infrastructure layer
class PrismaOrderRepository implements OrderRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({
      where: { id }, include: { items: true }
    });
    return row ? OrderMapper.toDomain(row) : null;
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { customerId }, include: { items: true }
    });
    return rows.map(OrderMapper.toDomain);
  }

  async save(order: Order): Promise<void> {
    await this.prisma.order.upsert({
      where: { id: order.id },
      create: OrderMapper.toPersistence(order),
      update: OrderMapper.toPersistence(order),
    });
  }
}
