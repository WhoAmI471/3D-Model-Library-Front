import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { deleteFile } from '@/lib/fileStorage'

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

export async function PUT(request, { params }) {
  const user = await getUserFromSession();
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  try {
    const { id } = params;

    // Помечаем модель на удаление
    const model = await prisma.model.update({
      where: { id },
      data: {
        markedForDeletion: true,
        markedById: user.id,
        markedAt: new Date()
      }
    });

    // Создаём запись в логах
    await prisma.log.create({
      data: {
        action: `Запрос на удаление модели`,
        userId: user.id,
        modelId: id
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Запрос на удаление отправлен администратору' 
    });
  } catch (error) {
    console.error('Error marking model:', error);
    return NextResponse.json(
      { error: 'Ошибка запроса на удаление' },
      { status: 500 }
    );
  }
}

// DELETE метод - подтверждение удаления (только для админов)
export async function DELETE(request, { params }) {
  const user = await getUserFromSession();
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  try {
    const { id } = params;
    const { approve } = await request.json();

    // Находим модель, помеченную на удаление
    const model = await prisma.model.findUnique({
      where: { 
        id,
        markedForDeletion: true // Только помеченные на удаление
      },
      include: {
        logs: true
      }
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Модель не найдена или не помечена на удаление' },
        { status: 404 }
      );
    }

    if (approve) {
      // 1. Удаляем файлы модели
      await deleteFile(model.fileUrl);
      await Promise.all(model.images.map(img => deleteFile(img)));

      // 2. Удаляем модель из базы
      await prisma.model.delete({
        where: { id }
      });

      return NextResponse.json(
        { success: true, message: 'Модель удалена' }
      );
    } else {
      // Отменяем пометку на удаление
      await prisma.model.update({
        where: { id },
        data: {
          markedForDeletion: false,
          markedById: null,
          markedAt: null
        }
      });

      return NextResponse.json(
        { success: true, message: 'Запрос на удаление отклонён' }
      );
    }
  } catch (error) {
    console.error('Error processing deletion:', error);
    return NextResponse.json(
      { error: 'Ошибка обработки запроса' },
      { status: 500 }
    );
  }
}