import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ITEMS_PER_PAGE = 20

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const action = searchParams.get('action')
    const user = searchParams.get('user')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where = {}
    
    if (action) {
      where.action = {
        contains: action,
        mode: 'insensitive'
      }
    }
    
    if (user) {
      where.user = {
        OR: [
          { name: { contains: user, mode: 'insensitive' } },
          { email: { contains: user, mode: 'insensitive' } }
        ]
      }
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }

    const [logs, totalCount] = await Promise.all([
      prisma.log.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          model: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE
      }),
      prisma.log.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

    return NextResponse.json({
      logs,
      totalPages,
      currentPage: page,
      totalCount
    })

  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { error: 'Ошибка загрузки логов' },
      { status: 500 }
    )
  }
}