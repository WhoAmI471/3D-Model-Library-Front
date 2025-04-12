// scripts/seed-admin.js
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hashed = await bcrypt.hash('DT_admin', 10)

  const exists = await prisma.user.findFirst({
    where: { email: 'admin@admin.com' },
  })

  if (exists) {
    console.log('Admin already exists')
    return
  }

  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@admin.com',
      password: hashed,
      role: 'ADMIN',
    },
  })

  console.log('Admin created')
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e)
    prisma.$disconnect()
  })
