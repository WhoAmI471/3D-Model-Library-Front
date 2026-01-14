import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const markedForDeletion = searchParams.get('markedForDeletion') === 'true'
  const includeAuthor = searchParams.get('includeAuthor') !== 'false'
  const includeProjects = searchParams.get('includeProjects') !== 'false'
  const includeMarkedBy = searchParams.get('includeMarkedBy') === 'true'

  try {
    const where = {}
    
    if (projectId) {
      where.projects = {
        some: {
          id: projectId
        }
      }
    }
    
    if (markedForDeletion) {
      where.markedForDeletion = true
      where.markedById = { not: null }
    }

    // Явно указываем какие поля включать для связанных моделей
    const include = {}
    
    if (includeAuthor) {
      include.author = {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
    
    if (includeProjects) {
      include.projects = {
        select: {
          id: true,
          name: true
        }
      }
    }
    
    if (includeMarkedBy) {
      include.markedBy = {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
    
    // Всегда включаем spheres для удобства использования на фронтенде
    include.spheres = {
      select: {
        id: true,
        name: true
      }
    }

    const orderBy = markedForDeletion 
      ? { markedAt: 'desc' } 
      : { createdAt: 'desc' }

    const models = await prisma.model.findMany({
      where,
      include: Object.keys(include).length > 0 ? include : undefined,
      orderBy
    })

    return NextResponse.json(models)
  } catch (error) {
    console.error('[Ошибка загрузки моделей]', error)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}