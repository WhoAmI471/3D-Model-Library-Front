// app/api/models/update/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveFile, deleteFile } from '@/lib/fileStorage'
import { getUserFromSession } from '@/lib/auth'

export async function POST(request) {
  const user = await getUserFromSession()
  if (!user) return new Response('Unauthorized', { status: 401 })

  try {
    const formData = await request.formData()
    const id = formData.get('id')
    
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
        project: true,
        author: true
      }
    })

    if (!existingModel) {
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      )
    }

    // Подготовка данных для обновления
    const updateData = {
      title: formData.get('title') || existingModel.title,
      description: formData.get('description') || existingModel.description,
      projectId: formData.get('projectId') || existingModel.projectId,
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
    
    if (updateData.projectId !== existingModel.projectId) {
      const newProject = await prisma.project.findUnique({
        where: { id: updateData.projectId }
      })
      changes.push(
        `Проект: "${existingModel.project?.name || 'нет'}" → "${newProject?.name || 'нет'}"`
      )
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
      updateData.fileUrl = await saveFile(zipFile, 'models')
      changes.push('Обновлён файл модели')
    }

    // Обработка скриншотов
    const screenshots = formData.getAll('screenshots')
    if (screenshots.length > 0) {
      const newScreenshots = await Promise.all(
        screenshots.map(file => saveFile(file, 'screenshots'))
      )
      updateData.images = [
        ...(existingModel.images || []),
        ...newScreenshots
      ]
      changes.push(`Добавлено ${screenshots.length} скриншотов`)
    }

    // Обновление модели
    const updatedModel = await prisma.model.update({
      where: { id: String(id) },
      data: updateData,
      include: {
        project: true,
        author: true
      }
    })

    // Создаём запись в логах, если были изменения
    if (changes.length > 0) {
      await prisma.log.create({
        data: {
          action: `Обновлена модель: ${changes.join(', ')}`,
          modelId: updatedModel.id,
          userId: user.id
        }
      })
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