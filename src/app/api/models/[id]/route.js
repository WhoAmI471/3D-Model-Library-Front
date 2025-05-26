import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export async function GET(request, { params }) {
  const user = await getUserFromSession()
  if (!user) return NextResponse.json(
    { error: 'Не авторизован' }, 
    { status: 401 }
  )

  try {
    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID модели обязательно' },
        { status: 400 }
      )
    }

    const model = await prisma.model.findUnique({
      where: { id: String(id) },
      include: {
        author: true,
        project: true,
        logs: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!model) {
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      )
    }

    return NextResponse.json(model)
  } catch (err) {
    console.error('[Ошибка загрузки модели]', err)
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

// DELETE метод
export async function DELETE(request, { params }) {
  const user = await getUserFromSession();
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const { id } = params;
    const { approve } = await request.json();

    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        logs: true,
        markedBy: true
      }
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      );
    }

    if (approve) {
      // Реальное удаление модели (кроме логов)
      await prisma.model.delete({
        where: { id }
      });

      // Сохраняем логи в отдельной таблице
      await prisma.deletedModelLogs.createMany({
        data: model.logs.map(log => ({
          ...log,
          modelId: id,
          deletedAt: new Date()
        }))
      });

      return NextResponse.json(
        { success: true, message: 'Модель удалена' }
      );
    } else {
      // Отмена пометки на удаление
      await prisma.model.update({
        where: { id },
        data: {
          markedForDeletion: false,
          markedById: null
        }
      });

      return NextResponse.json(
        { success: true, message: 'Удаление отменено' }
      );
    }
  } catch (error) {
    console.error('Error deleting model:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления модели' },
      { status: 500 }
    );
  }
}
