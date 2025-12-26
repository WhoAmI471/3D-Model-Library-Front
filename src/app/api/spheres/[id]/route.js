import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const user = await getUserFromSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    // Только администратор может удалять сферы
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID сферы обязательно' },
        { status: 400 }
      )
    }

    // Проверяем, существует ли сфера
    const existingSphere = await prisma.sphere.findUnique({
      where: { id },
      include: {
        models: {
          select: {
            id: true
          }
        }
      }
    })

    if (!existingSphere) {
      return NextResponse.json(
        { error: 'Сфера не найдена' },
        { status: 404 }
      )
    }

    // Проверяем, есть ли связанные модели
    if (existingSphere.models.length > 0) {
      return NextResponse.json(
        { error: `Невозможно удалить сферу. К ней привязано ${existingSphere.models.length} моделей. Сначала удалите или измените сферу у всех связанных моделей.` },
        { status: 400 }
      )
    }

    // Удаляем сферу
    await prisma.sphere.delete({
      where: { id }
    })

    return NextResponse.json(
      { success: true, message: 'Сфера успешно удалена' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Ошибка удаления сферы:', error)
    
    // Обработка ошибки внешнего ключа
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Невозможно удалить сферу. К ней привязаны модели.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

