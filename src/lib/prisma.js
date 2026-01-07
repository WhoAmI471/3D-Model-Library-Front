import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global

// Создаем pool для PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Создаем adapter для Prisma
const adapter = new PrismaPg(pool)

// В Prisma 7 нужно передавать adapter в конструктор
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
