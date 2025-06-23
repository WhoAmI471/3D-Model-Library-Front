import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { deleteFile } from '@/lib/fileStorage'
import { logModelAction } from '@/lib/logger'

export async function GET(request, { params }) {
  
  try {
    const user = await getUserFromSession()
    if (!user) return NextResponse.json(
      { error: 'Не авторизован' }, 
      { status: 401 }
    )
    const { id } = await params
    
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
        projects: true,
        versions: true,
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
    const { id } = await params;
    const { comment } = await request.json();

    // Помечаем модель на удаление с комментарием
    const model = await prisma.model.update({
      where: { id },
      data: {
        markedForDeletion: true,
        markedById: user.id,
        markedAt: new Date(),
        deletionComment: comment || null // Сохраняем комментарий
      }
    });

    // Создаём запись в логах с комментарием
    await logModelAction(
      `Запрос на удаление модели${comment ? ` (${comment})` : ''}`,
      id,
      user.id
    );

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
  // console.log(request.json())
  // console.log(params)

  try {
    const { id } = await params;
    const { approve } = await request.json();

    // Находим модель, помеченную на удаление
    const model = await prisma.model.findUnique({
      where: { 
        id
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
      // Удаляем файлы и запись из БД
      await deleteFile(model.fileUrl);
      await Promise.all(model.images.map(img => deleteFile(img)));
      await prisma.model.delete({ where: { id } });

      await logModelAction(
        `Модель удалена (${model.title})`,
        id,
        user.id
      );

      return NextResponse.json({ success: true, message: 'Модель удалена' });
    } else {
      // Отмена пометки на удаление
      await prisma.model.update({
        where: { id },
        data: {
          markedForDeletion: false,
          markedById: null,
          markedAt: null
        }
      });

      await logModelAction('Запрос на удаление отклонён', id, user.id);

      return NextResponse.json({
        success: true,
        message: 'Запрос на удаление отклонён'
      });
    }
  } catch (error) {
    console.error('Error processing deletion:', error);
    return NextResponse.json(
      { error: 'Ошибка обработки запроса' },
      { status: 500 }
    );
  }
}