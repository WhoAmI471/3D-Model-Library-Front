import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request, { params }) {
  try {
    const { id } = params // Получаем id из параметров маршрута
    const { name, modelIds } = await request.json()

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
      where: { id }
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

    // Обновляем проект и его связи с моделями
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name,
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
    const data = await request.json()
    const { id } = data

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

    if (existingProject.models.length > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить проект с привязанными моделями' },
        { status: 400 }
      )
    }

    await prisma.project.delete({
      where: { id }
    })

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