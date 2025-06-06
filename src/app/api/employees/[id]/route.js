import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

// GET /api/employees/[id]/route.js
export async function GET(request, { params }) {
  try {
    const user = await getUserFromSession()
    if (!user || user?.role !== 'ADMIN') { // Исправлено условие
      return NextResponse.json(
        { error: 'Не авторизован или недостаточно прав' }, 
        { status: 401 }
      )
    }
    
    const { id } = params // Убрали await перед params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID сотрудника обязательно' },
        { status: 400 }
      )
    }

    const employer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true
      }
    })

    if (!employer) {
      return NextResponse.json(
        { error: 'Сотрудник не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json(employer)
  } catch (err) {
    console.error('[Ошибка загрузки сотрудника]', err)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getUserFromSession()
    if (!user || user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Не авторизован или недостаточно прав' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { name, email, role, password, permissions = [] } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID сотрудника обязательно' },
        { status: 400 }
      )
    }

    const updateData = {
      name,
      email,
      role,
      permissions
    }

    // Если передан пароль, хешируем его
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }

    const updatedEmployer = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true
      }
    })


    return NextResponse.json(updatedEmployer)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления сотрудника' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromSession()
    if (!user || user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Не авторизован или недостаточно прав' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID сотрудника обязательно' },
        { status: 400 }
      )
    }

    const existingEmployer = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingEmployer) {
      return NextResponse.json(
        { error: 'Сотрудник не найден' },
        { status: 404 }
      )
    }

    await prisma.user.delete({
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