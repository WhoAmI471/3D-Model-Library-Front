import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { syncModelFolder } from '@/lib/nextcloud'
import { getUserFromSession } from '@/lib/auth'
import { logProjectAction } from '@/lib/logger'
import { saveProjectImage, deleteFile } from '@/lib/fileStorage'

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        models: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки проектов' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromSession()
    const contentType = request.headers.get('content-type') || ''
    
    let name, city, modelIds = [], imageFile = null
    
    if (contentType.includes('multipart/form-data')) {
      // Обработка FormData
      const formData = await request.formData()
      name = formData.get('name')
      city = formData.get('city')
      modelIds = formData.getAll('modelIds') || []
      imageFile = formData.get('image')
    } else {
      // Обработка JSON
      const data = await request.json()
      name = data.name
      city = data.city
      modelIds = data.modelIds || []
    }
    
    // Валидация
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Название проекта обязательно' },
        { status: 400 }
      )
    }

    // Проверка на дубликат
    const existingProject = await prisma.project.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    })

    if (existingProject) {
      return NextResponse.json(
        { error: 'Проект с таким названием уже существует' },
        { status: 400 }
      )
    }

    // Обработка изображения
    let imageUrl = null
    if (imageFile && typeof imageFile.arrayBuffer === 'function') {
      // Проверка типа файла
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
      if (!validMimeTypes.includes(imageFile.type?.toLowerCase())) {
        return NextResponse.json(
          { error: 'Разрешены только изображения: JPG, PNG, GIF, WEBP, BMP' },
          { status: 400 }
        )
      }
      imageUrl = await saveProjectImage(imageFile, name)
    }

    // Создание проекта с привязкой моделей
    const newProject = await prisma.project.create({
      data: {
        name,
        city: city?.trim() || null,
        imageUrl,
        models: {
          connect: modelIds.map(id => ({ id }))
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
      newProject.models.map(async m => {
        const model = await prisma.model.findUnique({
          where: { id: m.id },
          include: { projects: true }
        })
        if (model) await syncModelFolder(model)
      })
    )

    await logProjectAction(`Создан проект: ${newProject.name}`, user?.id || null)

    return NextResponse.json(newProject, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { 
        error: 'Ошибка создания проекта',
        details: error.message 
      },
      { status: 500 }
    )
  }
}