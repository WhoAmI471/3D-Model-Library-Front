import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { getUserFromSession } from '@/lib/auth'
import { logEmployeeAction } from '@/lib/logger'


export async function GET() {
  try {
    const employees = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        sphereId: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки сотрудников' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { name, email, role, password, permissions = [], sphereId } = await request.json()
    
    // Валидация данных
    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      )
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен быть не менее 6 символов' },
        { status: 400 }
      )
    }
    
    // Проверка существования пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Почта уже используется у другого пользователя, пожалуйста используйте другую почту' },
        { status: 400 }
      )
    }
    
    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Создание пользователя
    
    const newEmployee = await prisma.user.create({
      data: {
        name,
        email,
        role,
        permissions: permissions || [], // Убеждаемся, что permissions всегда массив
        password: hashedPassword,
        sphereId: (role === 'ANALYST' || role === 'ARTIST') ? (sphereId || null) : null,
      },
    })

    const user = await getUserFromSession()
    await logEmployeeAction(
      `Создан сотрудник: ${newEmployee.name} (${newEmployee.email})`,
      user?.id || null
    )
    
    // Не возвращаем пароль в ответе
    const { password: _, ...employeeWithoutPassword } = newEmployee
    
    return NextResponse.json(employeeWithoutPassword)
    
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { error: 'Ошибка создания сотрудника' },
      { status: 500 }
    )
  }
}