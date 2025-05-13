// app/api/models/[id]/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export async function GET(request, { params }) {
  const user = await getUserFromSession()
  if (!user) return new Response('Unauthorized', { status: 401 })

  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID модели обязательно' },
        { status: 400 }
      )
    }

    const model = await prisma.model.findUnique({
      where: { id: String(id) }
    })

    if (!model) {
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      )
    }

    return NextResponse.json(model)
  } catch (err) {
    console.error('[Ошибка загрузки модели]', err)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}