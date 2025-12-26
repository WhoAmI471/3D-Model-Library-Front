import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { checkPermission } from '@/lib/permission'
import { ALL_PERMISSIONS } from '@/lib/roles'

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
      include: {
        models: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Преобразуем результат, чтобы включить количество моделей
    const spheresWithCount = spheres.map(sphere => ({
      id: sphere.id,
      name: sphere.name,
      createdAt: sphere.createdAt,
      modelsCount: sphere.models.length
    }))

    return NextResponse.json(spheresWithCount)
  } catch (error) {
    console.error('Ошибка загрузки сфер:', error)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    // Проверяем право на создание сфер
    if (user.role !== 'ADMIN' && !checkPermission(user, ALL_PERMISSIONS.ADD_SPHERE)) {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Название сферы обязательно' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()

    // Проверяем, не существует ли уже сфера с таким именем
    const existingSphere = await prisma.sphere.findUnique({
      where: { name: trimmedName }
    })

    if (existingSphere) {
      return NextResponse.json(
        { error: 'Сфера с таким названием уже существует' },
        { status: 400 }
      )
    }

    const newSphere = await prisma.sphere.create({
      data: {
        name: trimmedName
      }
    })

    return NextResponse.json(newSphere, { status: 201 })
  } catch (error) {
    console.error('Ошибка создания сферы:', error)
    
    // Обработка ошибки уникальности от Prisma
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Сфера с таким названием уже существует' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

