const { PrismaClient } = require('@prisma/client');

// Create a single instance of PrismaClient and reuse it
let prisma;

if (!global.prisma) {
  global.prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
}

prisma = global.prisma;

module.exports = prisma; 