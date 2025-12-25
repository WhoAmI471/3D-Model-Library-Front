// app/dashboard/models/[id]/page.js
import { ModelCard } from '@/components/ModelCard'
import { prisma } from '@/lib/prisma'
import axios from 'axios'
import { getUserFromSession } from '@/lib/auth'
import { logModelAction } from '@/lib/logger'
import { deleteFile } from '@/lib/fileStorage'
import { deleteFolderRecursive, sanitizeName } from '@/lib/nextcloud'

// Принудительно делаем страницу динамической, так как она использует базу данных
export const dynamic = 'force-dynamic'

export const handleDeleteRequest = async (modelId, immediate) => {
  'use server'
  try {
    const user = await getUserFromSession()
    if (!user) {
      return { success: false, error: 'Не авторизован' }
    }

    if (immediate && user.role === 'ADMIN') {
      // Получаем модель со всеми данными
      const model = await prisma.model.findUnique({
        where: { id: modelId },
        include: {
          logs: true
        }
      })

      if (!model) {
        return { success: false, error: 'Модель не найдена' }
      }

      // Удаляем файлы и связанные записи из БД
      await deleteFile(model.fileUrl)
      await Promise.all(model.images.map(img => deleteFile(img)))
      
      // Удаляем версии модели
      await prisma.modelVersion.deleteMany({ where: { modelId } })
      
      // Обнуляем ссылки на модель в логах, чтобы сохранить историю
      await prisma.log.updateMany({ where: { modelId }, data: { modelId: null } })
      
      // Удаляем модель
      await prisma.model.delete({ where: { id: modelId } })
      
      // Удаляем папку модели в Nextcloud
      await deleteFolderRecursive(`models/${sanitizeName(model.title)}`)

      await logModelAction(
        `Модель удалена (${model.title})`,
        modelId,
        user.id
      )

      return { success: true, redirect: '/dashboard' }
    } else {
      return { success: false, error: 'Доступ запрещен' }
    }
  } catch (error) {
    console.error('Ошибка при удалении:', error)
    return { success: false, error: error.message || 'Ошибка при удалении' }
  }
}


export default async function ModelPage({ params, searchParams }) {
  try {
    // Получаем параметры
    const { id } = await params
    const { projectid } = await searchParams

    // Принудительно обновляем данные из БД без кэширования
    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        author: true,
        projects: true,
        sphere: true,
        versions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        logs: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!model) {
      return <div>Модель не найдена</div>
    }


    return (
      <div className="container mx-auto">
        <ModelCard 
          model={model} 
          onDeleteRequest={handleDeleteRequest}
          projectId={projectid}
        />
      </div>
    )
  } catch (error) {
    console.error('Error in ModelPage:', error)
    return <div>Произошла ошибка при загрузке страницы</div>
  }
}