import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const spheres = await prisma.sphere.findMany({
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(spheres)
  } catch (error) {
    console.error('Ошибка загрузки сфер:', error)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

