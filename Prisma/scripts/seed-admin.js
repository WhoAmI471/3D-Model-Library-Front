// scripts/seed-admin.js
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { config } from 'dotenv'
import { ALL_PERMISSIONS } from '../../src/lib/roles.js'

config()

// Используем PrismaClient напрямую с переменной окружения
// В Prisma 7 конфигурация должна быть доступна через process.env.DATABASE_URL
const prisma = new PrismaClient()

async function main() {
  const hashed = await bcrypt.hash('DT_admin', 10)

  // Получаем все возможные permissions
  const allPermissions = Object.values(ALL_PERMISSIONS)

  const exists = await prisma.user.findFirst({
    where: { email: 'admin@admin.com' },
  })

  if (exists) {
    // Обновляем существующего админа, добавляя все permissions
    await prisma.user.update({
      where: { email: 'admin@admin.com' },
      data: {
        permissions: allPermissions,
      },
    })
    console.log('Admin updated with all permissions')
    return
  }

  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@admin.com',
      password: hashed,
      role: 'ADMIN',
      permissions: allPermissions,
    },
  })

  console.log('Admin created with all permissions')
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e)
    prisma.$disconnect()
  })
