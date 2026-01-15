import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title')
  const excludeId = searchParams.get('excludeId') // ID модели для исключения при редактировании

  if (!title || title.trim().length === 0) {
    return NextResponse.json({ exists: false })
  }

  try {
    const where = {
      title: {
        equals: title.trim(),
        mode: 'insensitive' // Регистронезависимый поиск
      }
    }

    // При редактировании исключаем текущую модель
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const existingModel = await prisma.model.findFirst({
      where
    })

    return NextResponse.json({ exists: !!existingModel })
  } catch (error) {
    console.error('[Ошибка проверки названия модели]', error)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}
