// /app/api/models/route.js
import prisma from '@/lib/prisma'

export async function GET() {
  const models = await prisma.model.findMany({
    include: {
      project: true,
      author: true,
    },
  })
  return Response.json(models)
}
