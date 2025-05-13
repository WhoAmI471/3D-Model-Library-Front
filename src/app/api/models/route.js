// /app/api/models/route.js
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'


export async function GET() {
  const user = await getUserFromSession()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const models = await prisma.model.findMany({
    include: {
      project: true,
      author: true,
    },
  })
  return Response.json(models)
}
