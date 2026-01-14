import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { deleteFile } from '@/lib/fileStorage'
import { deleteFolderRecursive, sanitizeName } from '@/lib/nextcloud'

export async function GET(request) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [deletedModels, totalCount] = await Promise.all([
      prisma.deletedModel.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          deletedAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.deletedModel.count()
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      deletedModels,
      totalCount,
      totalPages,
      currentPage: page
    })
  } catch (error) {
    console.error('Error fetching deleted models:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки удаленных моделей' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    // Получаем все удаленные модели
    const deletedModels = await prisma.deletedModel.findMany()

    // Удаляем все скриншоты и папки
    for (const model of deletedModels) {
      if (model.images && model.images.length > 0) {
        await Promise.all(model.images.map(img => deleteFile(img).catch(err => {
          console.warn('Ошибка при удалении изображения:', err)
        })))
      }

      if (model.title) {
        try {
          await deleteFolderRecursive(`models/${sanitizeName(model.title)}`)
        } catch (error) {
          console.warn('Ошибка при удалении папки модели:', error)
        }
      }
    }

    // Удаляем все записи из БД
    await prisma.deletedModel.deleteMany()

    return NextResponse.json({ 
      success: true, 
      message: `Удалено ${deletedModels.length} моделей` 
    })
  } catch (error) {
    console.error('Error deleting all deleted models:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления моделей' },
      { status: 500 }
    )
  }
}
