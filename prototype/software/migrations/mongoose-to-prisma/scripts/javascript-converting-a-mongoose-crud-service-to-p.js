// Input:  Express route handlers using Mongoose for User CRUD
// Output: Same handlers using Prisma Client with full error handling

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// CREATE
async function createUser(req, res) {
  try {
    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        name: req.body.name,
        address: {              // embedded document via composite type
          set: {
            street: req.body.street,
            city: req.body.city,
            zip: req.body.zip,
          },
        },
      },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}

// READ with relations and filtering
async function getUsers(req, res) {
  const { search, page = 1, limit = 20 } = req.query;
  const users = await prisma.user.findMany({
    where: search
      ? { name: { contains: search, mode: 'insensitive' } }
      : undefined,
    include: { posts: { take: 5, orderBy: { createdAt: 'desc' } } },
    skip: (page - 1) * limit,
    take: Number(limit),
    orderBy: { name: 'asc' },
  });
  res.json(users);
}

// UPDATE
async function updateUser(req, res) {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      name: req.body.name,
      address: req.body.address
        ? { set: req.body.address }
        : undefined,
    },
  });
  res.json(user);
}

// DELETE
async function deleteUser(req, res) {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).end();
}
