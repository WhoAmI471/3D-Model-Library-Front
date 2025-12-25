// scripts/seed-spheres.js
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const spheres = [
  { name: 'Строительство' },
  { name: 'Химия' },
  { name: 'Промышленность' },
  { name: 'Медицина' },
  { name: 'Другое' },
]

async function main() {
  console.log('Seeding spheres...')

  for (const sphere of spheres) {
    await prisma.sphere.upsert({
      where: { name: sphere.name },
      update: {},
      create: sphere,
    })
    console.log(`✓ Sphere "${sphere.name}" ensured`)
  }

  console.log('All spheres seeded successfully!')
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })

