// Input:  Mongoose schema with nested subdocuments and arrays
// Output: Equivalent Prisma schema + TypeScript query code

// --- Mongoose schema (BEFORE) ---
// const orderSchema = new Schema({
//   customer: { type: Schema.Types.ObjectId, ref: 'User' },
//   items: [{
//     product: String,
//     quantity: Number,
//     price: Number,
//   }],
//   shippingAddress: {
//     street: String,
//     city: String,
//     country: String,
//   },
//   status: { type: String, enum: ['pending', 'shipped', 'delivered'], default: 'pending' },
// });

// --- Prisma schema (AFTER) in schema.prisma ---
// model Order {
//   id              String         @id @default(auto()) @map("_id") @db.ObjectId
//   customerId      String         @db.ObjectId
//   customer        User           @relation(fields: [customerId], references: [id])
//   items           OrderItem[]    // composite type array
//   shippingAddress ShippingAddress?
//   status          String         @default("pending")
//   createdAt       DateTime       @default(now())
// }
//
// type OrderItem {
//   product  String
//   quantity Int
//   price    Float
// }
//
// type ShippingAddress {
//   street  String
//   city    String
//   country String
// }

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create order with embedded documents
async function createOrder(customerId: string) {
  return prisma.order.create({
    data: {
      customerId,
      items: [
        { product: 'Keyboard', quantity: 1, price: 79.99 },
        { product: 'Mouse', quantity: 2, price: 29.99 },
      ],
      shippingAddress: {
        set: { street: '123 Main St', city: 'Berlin', country: 'DE' },
      },
      status: 'pending',
    },
    include: { customer: true },
  });
}

// Filter by embedded document fields
async function findOrdersByCity(city: string) {
  return prisma.order.findMany({
    where: {
      shippingAddress: {
        is: { city },
      },
    },
  });
}
