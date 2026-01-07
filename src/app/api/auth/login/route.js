// /app/api/auth/login/route.js
import bcrypt from 'bcrypt'
import { createSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request) {
  const { email, password } = await request.json()

  // try {
    const user = await prisma.user.findUnique({ where: { email } })
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { error: 'Неверные учетные данные' },
        { status: 401 }
      )
    }

    await createSession(user)

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    })

  // } catch (error) {
  //   return NextResponse.json(
  //     { error: 'Ошибка сервера' },
  //     { status: 500 }
  //   )
  // }
}
