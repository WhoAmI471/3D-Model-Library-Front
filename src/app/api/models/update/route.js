// app/api/models/update/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveFile, deleteFile } from '@/lib/fileStorage'

export async function POST(request) {
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
      where: { id: String(id) }
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

    // Обработка ZIP-файла
    const zipFile = formData.get('zipFile')
    if (zipFile && zipFile.size > 0) {
      if (existingModel.fileUrl) {
        await deleteFile(existingModel.fileUrl)
      }
      updateData.fileUrl = await saveFile(zipFile, 'models')
    }

    // Обработка скриншотов
    const screenshots = formData.getAll('screenshots')
    if (screenshots.length > 0) {
      const newScreenshots = await Promise.all(
        screenshots.map(file => saveFile(file, 'screenshots'))
      )
      updateData.screenshots = [
        ...(existingModel.screenshots || []),
        ...newScreenshots
      ]
    }

    // Обновление модели
    const updatedModel = await prisma.model.update({
      where: { id: String(id) },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      data: updatedModel 
    })

  } catch (err) {
    console.error('[Ошибка обновления модели]', err)
    return NextResponse.json(
      { error: err.message || 'Ошибка сервера' },
      { status: 500 }
    )
  }
}