// /app/api/auth/login/route.js
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { createSession } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request) {
  const { email, password } = await request.json()

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return new Response(JSON.stringify({ message: 'Неверный логин или пароль' }), {
      status: 401,
    })
  }

  await createSession(user)

  return new Response(JSON.stringify({ message: 'Успешный вход' }), {
    status: 200,
  })
}
