import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined | null
}

// Crear un mock client para cuando PostgreSQL no esté disponible
const mockPrismaClient = {
  search: {
    create: async () => ({ id: 'mock', query: '', platform: null, results: 0, createdAt: new Date() }),
    findMany: async () => []
  },
  scrapingLog: {
    create: async () => ({ id: 'mock', platform: 'ALIEXPRESS', status: 'success', createdAt: new Date() }),
    findMany: async () => []
  },
  product: {
    create: async () => ({ id: 'mock' }),
    findMany: async () => []
  },
  vendor: {
    create: async () => ({ id: 'mock' }),
    findMany: async () => []
  },
  review: {
    create: async () => ({ id: 'mock' }),
    findMany: async () => []
  }
} as any

let prismaInstance: PrismaClient | null = null

try {
  // Solo crear el cliente si hay una DATABASE_URL configurada
  if (process.env.DATABASE_URL && process.env.DATABASE_URL !== "postgresql://username:password@localhost:5432/lukia_db") {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  } else {
    console.log('[Prisma] Using mock client - PostgreSQL not configured')
    prismaInstance = mockPrismaClient
  }
} catch (error) {
  console.log('[Prisma] Using mock client - Database unavailable')
  prismaInstance = mockPrismaClient
}

export const prisma = globalForPrisma.prisma ?? prismaInstance

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma