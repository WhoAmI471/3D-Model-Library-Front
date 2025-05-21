import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const { name } = await request.json()

    // Валидация данных
    if (!name) {
      return NextResponse.json(
        { error: 'Название проекта обязательно' },
        { status: 400 }
      )
    }

    // Проверка существования проекта
    const existingProject = await prisma.project.findUnique({
      where: { id }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      )
    }

    // Обновление проекта
    const updatedProject = await prisma.project.update({
      where: { id },
      data: { name },
      include: {
        models: {
          select: {
            id: true
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
    const { id } = params

    // Проверка существования проекта
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

    // Проверка на наличие связанных моделей
    if (existingProject.models.length > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить проект с привязанными моделями' },
        { status: 400 }
      )
    }

    // Удаление проекта
    await prisma.project.delete({
      where: { id }
    })

    return NextResponse.json(
      { success: true },
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