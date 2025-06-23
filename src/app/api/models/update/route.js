// app/api/models/update/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveModelFile, deleteFile } from '@/lib/fileStorage'
import { getUserFromSession } from '@/lib/auth'
import { logModelAction } from '@/lib/logger'

export async function POST(request) {
  const user = await getUserFromSession()
  if (!user) return new Response('Unauthorized', { status: 401 })

  try {
    const formData = await request.formData()
    const projectIds = formData.getAll('projectIds')
    const id = formData.get('id')
    const version = formData.get('version')
    const deletedScreenshots = formData.getAll('deletedScreenshots')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID модели обязательно' },
        { status: 400 }
      )
    }

    // Получаем текущую модель
    const existingModel = await prisma.model.findUnique({
      where: { id: String(id) },
      include: {
        projects: true,
        author: true
      }
    })

    if (!existingModel) {
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      )
    }

    // Удаляем скриншоты, которые были помечены на удаление
    if (deletedScreenshots.length > 0) {
      await Promise.all(
        deletedScreenshots.map(url => deleteFile(url))
      )
      
      // Обновляем список изображений, исключая удаленные
      const updatedImages = existingModel.images.filter(
        image => !deletedScreenshots.includes(image)
      )
      
      await prisma.model.update({
        where: { id: String(id) },
        data: { images: updatedImages }
      })
    }

    // Подготовка данных для обновления
    const updateData = {
      title: formData.get('title') || existingModel.title,
      description: formData.get('description') || existingModel.description,
      authorId: formData.get('authorId') || existingModel.authorId,
      sphere: formData.get('sphere') || existingModel.sphere
    }

    // Собираем информацию об изменениях для лога
    const changes = []
    
    if (updateData.title !== existingModel.title) {
      changes.push(`Название: "${existingModel.title}" → "${updateData.title}"`)
    }
    
    if (updateData.description !== existingModel.description) {
      changes.push('Обновлено описание')
    }
    
    // Сравниваем проекты
    const currentProjectIds = existingModel.projects.map(p => p.id).sort()
    const newProjectIds = [...projectIds].sort()
    
    if (JSON.stringify(currentProjectIds) !== JSON.stringify(newProjectIds)) {
      // Получаем названия проектов для лога
      const currentProjects = existingModel.projects.map(p => p.name).join(', ') || 'нет'
      const newProjects = await prisma.project.findMany({
        where: { id: { in: newProjectIds } }
      })
      const newProjectNames = newProjects.map(p => p.name).join(', ') || 'нет'
      
      changes.push(`Проекты: "${currentProjects}" → "${newProjectNames}"`)
      
      // Добавляем связь с проектами
      updateData.projects = {
        set: newProjectIds.map(id => ({ id }))
      }
    }
    
    if (updateData.authorId !== existingModel.authorId) {
      const newAuthor = await prisma.user.findUnique({
        where: { id: updateData.authorId }
      })
      changes.push(
        `Автор: "${existingModel.author?.name || 'нет'}" → "${newAuthor?.name || 'нет'}"`
      )
    }
    
    if (updateData.sphere !== existingModel.sphere) {
      changes.push(`Сфера: "${existingModel.sphere}" → "${updateData.sphere}"`)
    }

    // Обработка ZIP-файла
    const zipFile = formData.get('zipFile')
    if (zipFile && zipFile.size > 0) {
      if (existingModel.fileUrl) {
        await deleteFile(existingModel.fileUrl)
      }
      updateData.fileUrl = await saveModelFile(zipFile, id, version || 'current')
      changes.push('Обновлён файл модели')
    }

    // Обработка новых скриншотов
    const screenshots = formData.getAll('screenshots')
    if (screenshots.length > 0) {
      const newScreenshots = await Promise.all(
        screenshots.map(file => saveModelFile(file, id, version || 'current', true))
      )
      
      // Получаем текущие изображения (уже без удаленных)
      const currentImages = existingModel.images
        ? existingModel.images.filter(image => !deletedScreenshots.includes(image))
        : []
      
      updateData.images = [
        ...currentImages,
        ...newScreenshots
      ]
      changes.push(`Добавлено ${screenshots.length} скриншотов`)
    }

    // Обновление модели
  const updatedModel = await prisma.model.update({
    where: { id: String(id) },
    data: updateData,
    include: {
      projects: true,
      author: true
    }
  })

    if (version) {
      await prisma.modelVersion.create({
        data: {
          modelId: updatedModel.id,
          version,
          fileUrl: updatedModel.fileUrl,
          images: updatedModel.images
        }
      })
    }

    // Создаём запись в логах, если были изменения
    if (changes.length > 0) {
      await logModelAction(
        `Обновлена модель: ${changes.join(', ')}`,
        updatedModel.id,
        user.id
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedModel,
      changes: changes.length > 0 ? changes : 'Нет изменений'
    })

  } catch (err) {
    console.error('[Ошибка обновления модели]', err)
    return NextResponse.json(
      { error: err.message || 'Ошибка сервера' },
      { status: 500 }
    )
  }
}