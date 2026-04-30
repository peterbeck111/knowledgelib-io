// Input:  Mongoose pre-save hooks and virtuals
// Output: Prisma Client extensions that replicate the same behavior

import { PrismaClient, Prisma } from '@prisma/client';

// Mongoose middleware equivalent via Prisma Client extensions
const prisma = new PrismaClient().$extends({
  query: {
    user: {
      // Equivalent of Mongoose pre('save') hook
      async create({ args, query }) {
        // Normalize email before save (like a pre-save hook)
        if (args.data.email) {
          args.data.email = (args.data.email as string).toLowerCase().trim();
        }
        // Set default timestamps (Mongoose does this automatically)
        args.data.createdAt = args.data.createdAt ?? new Date();
        args.data.updatedAt = new Date();
        return query(args);
      },
      async update({ args, query }) {
        // Auto-update timestamp on every save
        args.data.updatedAt = new Date();
        return query(args);
      },
    },
  },
  result: {
    user: {
      // Equivalent of Mongoose virtuals
      fullName: {
        needs: { firstName: true, lastName: true },
        compute(user) {
          return `${user.firstName} ${user.lastName}`;
        },
      },
    },
  },
});

// Usage — identical to standard Prisma Client
async function example() {
  const user = await prisma.user.create({
    data: {
      email: ' Alice@Example.COM ',
      firstName: 'Alice',
      lastName: 'Smith',
    },
  });
  console.log(user.email);    // "alice@example.com" (normalized by extension)
  console.log(user.fullName); // "Alice Smith" (computed virtual)
}
