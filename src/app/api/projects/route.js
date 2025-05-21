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
    const { name } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Название проекта обязательно' },
        { status: 400 }
      )
    }
    
    const newProject = await prisma.project.create({
      data: { name },
      include: {
        models: {
          select: {
            id: true
          }
        }
      }
    })
    
    return NextResponse.json(newProject)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Ошибка создания проекта' },
      { status: 500 }
    )
  }
}