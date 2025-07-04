// app/dashboard/models/[id]/page.js
import { ModelCard } from '@/components/ModelCard'
import { prisma } from '@/lib/prisma'
import axios from 'axios'
import { getUserFromSession } from '@/lib/auth'
import { logModelAction } from '@/lib/logger'

export const handleDeleteRequest = async (modelId, immediate) => {
  'use server'
  try {
    if (immediate || role === 'ADMIN') {
      await prisma.model.delete({
        where: { id: modelId }
      })
      return { success: true, redirect: '/dashboard' }
    } else {
      await logModelAction(
        `Запрос на удаление модели ${modelId}`,
        modelId,
        user.id
      )
      return { success: true, message: 'Запрос на удаление отправлен администратору' }
    }
  } catch (error) {
    console.error('Ошибка при удалении:', error)
    return { success: false, error: 'Ошибка при удалении' }
  }
}


export default async function ModelPage({ params, searchParams }) {
  try {
    // Получаем параметры
    const { id } = await params
    const { projectid } = await searchParams

    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        author: true,
        projects: true,
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