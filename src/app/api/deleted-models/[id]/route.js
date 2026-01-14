import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { deleteFile } from '@/lib/fileStorage'
import { deleteFolderRecursive, sanitizeName } from '@/lib/nextcloud'

export async function GET(request, { params }) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { id } = await params

    const deletedModel = await prisma.deletedModel.findUnique({
      where: { id: String(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!deletedModel) {
      return NextResponse.json(
        { error: 'Удаленная модель не найдена' },
        { status: 404 }
      )
    }

    return NextResponse.json(deletedModel)
  } catch (error) {
    console.error('Error fetching deleted model:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки удаленной модели' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromSession()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещён' },
        { status: 403 }
      )
    }

    const { id } = await params

    const deletedModel = await prisma.deletedModel.findUnique({
      where: { id: String(id) }
    })

    if (!deletedModel) {
      return NextResponse.json(
        { error: 'Удаленная модель не найдена' },
        { status: 404 }
      )
    }

    // Удаляем скриншоты из Nextcloud
    if (deletedModel.images && deletedModel.images.length > 0) {
      await Promise.all(deletedModel.images.map(img => deleteFile(img)))
    }

    // Удаляем папку модели (если есть)
    if (deletedModel.title) {
      try {
        await deleteFolderRecursive(`models/${sanitizeName(deletedModel.title)}`)
      } catch (error) {
        // Игнорируем ошибку, если папка уже удалена
        console.warn('Ошибка при удалении папки модели:', error)
      }
    }

    // Удаляем запись из БД
    await prisma.deletedModel.delete({
      where: { id: String(id) }
    })

    return NextResponse.json({ success: true, message: 'Модель полностью удалена' })
  } catch (error) {
    console.error('Error deleting deleted model:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления модели' },
      { status: 500 }
    )
  }
}
