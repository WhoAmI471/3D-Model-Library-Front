import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

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
    const { name, modelIds = [] } = await request.json()
    
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

    // Создание проекта с привязкой моделей
    const newProject = await prisma.project.create({
      data: {
        name,
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