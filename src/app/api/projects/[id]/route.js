import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncModelFolder } from '@/lib/nextcloud'
import { getUserFromSession } from '@/lib/auth'
import { logProjectAction } from '@/lib/logger'
import { saveProjectImage, deleteFile } from '@/lib/fileStorage'


export async function GET(request, { params }) {
  const { id } = await params

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        models: {
          include: {
            author: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('[Ошибка загрузки проекта]', error)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params // Получаем id из параметров маршрута
    const user = await getUserFromSession()
    const contentType = request.headers.get('content-type') || ''
    
    let name, city, modelIds = [], imageFile = null, deleteImage = false
    
    if (contentType.includes('multipart/form-data')) {
      // Обработка FormData
      const formData = await request.formData()
      name = formData.get('name')
      city = formData.get('city')
      modelIds = formData.getAll('modelIds') || []
      imageFile = formData.get('image')
      deleteImage = formData.get('deleteImage') === 'true'
    } else {
      // Обработка JSON
      const data = await request.json()
      name = data.name
      city = data.city
      modelIds = data.modelIds || []
    }

    if (!id) {
      return NextResponse.json(
        { error: 'ID проекта обязательно' },
        { status: 400 }
      )
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Название проекта обязательно' },
        { status: 400 }
      )
    }

    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: { models: true }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      )
    }

    // Проверка на дубликат (исключая текущий проект)
    const duplicateProject = await prisma.project.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        NOT: {
          id: id
        }
      }
    })

    if (duplicateProject) {
      return NextResponse.json(
        { error: 'Проект с таким названием уже существует' },
        { status: 400 }
      )
    }

    const changes = []

    if (name !== existingProject.name) {
      changes.push(`Название: "${existingProject.name}" → "${name}"`)
    }

    const cityValue = city?.trim() || null
    if (cityValue !== (existingProject.city || null)) {
      changes.push(`Город: "${existingProject.city || 'не указан'}" → "${cityValue || 'не указан'}"`)
    }

    const currentModelIds = existingProject.models.map(m => m.id).sort()
    const newModelIds = [...modelIds].sort()
    if (JSON.stringify(currentModelIds) !== JSON.stringify(newModelIds)) {
      const currentNames = existingProject.models.map(m => m.title).join(', ') || 'нет'
      const newModels = await prisma.model.findMany({
        where: { id: { in: newModelIds } },
        select: { title: true }
      })
      const newNames = newModels.map(m => m.title).join(', ') || 'нет'
      changes.push(`Модели: "${currentNames}" → "${newNames}"`)
    }

    // Обработка изображения
    let imageUrl = existingProject.imageUrl
    if (deleteImage) {
      if (existingProject.imageUrl) {
        await deleteFile(existingProject.imageUrl)
      }
      imageUrl = null
      changes.push('Удалено изображение проекта')
    } else if (imageFile && typeof imageFile.arrayBuffer === 'function') {
      // Проверка типа файла
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
      if (!validMimeTypes.includes(imageFile.type?.toLowerCase())) {
        return NextResponse.json(
          { error: 'Разрешены только изображения: JPG, PNG, GIF, WEBP, BMP' },
          { status: 400 }
        )
      }
      // Удаляем старое изображение, если оно есть
      if (existingProject.imageUrl) {
        await deleteFile(existingProject.imageUrl)
      }
      imageUrl = await saveProjectImage(imageFile, name)
      changes.push('Обновлено изображение проекта')
    }

    // Обновляем проект и его связи с моделями
  const updatedProject = await prisma.project.update({
    where: { id },
    data: {
      name,
      city: cityValue,
      imageUrl,
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

    await Promise.all(
      updatedProject.models.map(async m => {
        const model = await prisma.model.findUnique({
          where: { id: m.id },
          include: { projects: true }
        })
        if (model) await syncModelFolder(model)
      })
    )

    if (changes.length > 0) {
      await logProjectAction(`Обновлен проект: ${changes.join(', ')}`, user?.id || null)
    }

    return NextResponse.json(updatedProject)

  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления проекта' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params // Получаем id из параметров маршрута
    const user = await getUserFromSession()

    if (!id) {
      return NextResponse.json(
        { error: 'ID проекта обязательно' },
        { status: 400 }
      )
    }

    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        models: true
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      )
    }

    // Сначала отвязываем все модели от проекта
    await prisma.project.update({
      where: { id },
      data: {
        models: {
          set: [] // Очищаем связи с моделями
        }
      }
    })

    // Затем удаляем сам проект
    await prisma.project.delete({
      where: { id }
    })

    // Синхронизируем папки для всех ранее связанных моделей
  await Promise.all(
      existingProject.models.map(async model => {
        const updatedModel = await prisma.model.findUnique({
          where: { id: model.id },
          include: { projects: true }
        })
        if (updatedModel) await syncModelFolder(updatedModel)
      })
    )

    await logProjectAction(`Проект удалён: ${existingProject.name}`, user?.id || null)

    return NextResponse.json(
      { success: true, message: 'Проект успешно удален' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления проекта' },
      { status: 500 }
    )
  }
}