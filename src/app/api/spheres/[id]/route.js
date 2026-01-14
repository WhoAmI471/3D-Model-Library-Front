import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { logSphereAction } from '@/lib/logger'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const user = await getUserFromSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID сферы обязательно' },
        { status: 400 }
      )
    }

    const sphere = await prisma.sphere.findUnique({
      where: { id },
      include: {
        models: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            projects: {
              select: {
                id: true,
                name: true
              }
            },
            spheres: {
              select: {
                id: true,
                name: true
              }
            },
            versions: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 1
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!sphere) {
      return NextResponse.json(
        { error: 'Сфера не найдена' },
        { status: 404 }
      )
    }

    return NextResponse.json(sphere)
  } catch (error) {
    console.error('Ошибка загрузки сферы:', error)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const user = await getUserFromSession()

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    // Только администратор может изменять сферы
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

    const body = await request.json()
    const { name, modelIds = [] } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Название сферы обязательно' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()

    // Проверяем длину названия
    if (trimmedName.length > 50) {
      return NextResponse.json(
        { error: 'Название сферы не должно превышать 50 символов' },
        { status: 400 }
      )
    }

    // Проверяем зарезервированные названия (без учета регистра)
    const lowerName = trimmedName.toLowerCase()
    if (lowerName === 'все модели' || lowerName === 'без сферы') {
      return NextResponse.json(
        { error: 'Название "Все модели" и "Без сферы" зарезервированы и не могут быть использованы' },
        { status: 400 }
      )
    }

    // Проверяем, существует ли сфера
    const existingSphere = await prisma.sphere.findUnique({
      where: { id }
    })

    if (!existingSphere) {
      return NextResponse.json(
        { error: 'Сфера не найдена' },
        { status: 404 }
      )
    }


    // Проверяем, не существует ли уже сфера с таким именем (кроме текущей)
    const duplicateSphere = await prisma.sphere.findFirst({
      where: {
        name: trimmedName,
        NOT: {
          id: id
        }
      }
    })

    if (duplicateSphere) {
      return NextResponse.json(
        { error: 'Сфера с таким названием уже существует' },
        { status: 400 }
      )
    }

    // Сохраняем старое название для лога
    const oldName = existingSphere.name

    // Обновляем сферу
    const updatedSphere = await prisma.sphere.update({
      where: { id },
      data: {
        name: trimmedName,
        models: {
          set: modelIds.map(modelId => ({ id: modelId }))
        }
      },
      include: {
        models: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    await logSphereAction(`Изменено название сферы: "${oldName}" → "${trimmedName}"`, user?.id || null)

    return NextResponse.json(updatedSphere, { status: 200 })

  } catch (error) {
    console.error('Ошибка обновления сферы:', error)
    console.error('Детали ошибки:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    
    // Обработка ошибки уникальности от Prisma
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Сфера с таким названием уже существует' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    )
  }
}

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
      where: { id }
    })

    if (!existingSphere) {
      return NextResponse.json(
        { error: 'Сфера не найдена' },
        { status: 404 }
      )
    }

    // Сохраняем название сферы для лога перед удалением
    const sphereName = existingSphere.name

    // Удаляем сферу
    await prisma.sphere.delete({
      where: { id }
    })

    await logSphereAction(`Удалена сфера: ${sphereName}`, user?.id || null)

    return NextResponse.json(
      { success: true, message: 'Сфера успешно удалена' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Ошибка удаления сферы:', error)
    
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

