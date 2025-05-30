import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const markedForDeletion = searchParams.get('markedForDeletion') === 'true'
  const includeAuthor = searchParams.get('includeAuthor') !== 'false' // default true
  const includeProjects = searchParams.get('includeProjects') !== 'false' // default true
  const includeMarkedBy = searchParams.get('includeMarkedBy') === 'true' // default false

  try {
    // Строим условия WHERE
    const where = {}
    
    // Фильтр по проекту
    if (projectId) {
      where.projects = {
        some: {
          id: projectId
        }
      }
    }
    
    // Фильтр по моделям, помеченным на удаление
    if (markedForDeletion) {
      where.markedForDeletion = true
      where.markedById = { not: null }
    }

    // Строим параметры включения связанных данных
    const include = {}
    if (includeAuthor) include.author = true
    if (includeProjects) include.projects = true
    if (includeMarkedBy) include.markedBy = true

    // Определяем сортировку
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