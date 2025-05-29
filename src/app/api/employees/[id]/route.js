import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(request, { params }) {
  try {
    // const data = 
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID сотрудника обязательно' },
        { status: 400 }
      )
    }

    const existingProject = await prisma.employees.findUnique({
      where: { id },
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Сотрудник не найден' },
        { status: 404 }
      )
    }

    // if (existingProject.models.length > 0) {
    //   return NextResponse.json(
    //     { error: 'Нельзя удалить проект с привязанными моделями' },
    //     { status: 400 }
    //   )
    // }

    await prisma.project.delete({
      where: { id }
    })

    return NextResponse.json(
      { success: true, message: 'Сотрудник успешно удален' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления сотрудника' },
      { status: 500 }
    )
  }
}