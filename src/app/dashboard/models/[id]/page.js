import { ModelCard } from '@/components/ModelCard';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth'

export default async function ModelPage({ params }) {
  const model = await prisma.model.findUnique({
    where: { id: params.id },
    include: {
      author: true,
      projects: true,
      logs: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  
  if (!model) {
    return <div>Модель не найдена</div>;
  }
  
  const user = await getUserFromSession()
  const role = user?.role || null

  const handleDeleteRequest = async (modelId, immediate) => {
    'use server'
    try {
      if (immediate || role === 'ADMIN') {
        // Немедленное удаление для админа
        await prisma.model.delete({
          where: { id: modelId }
        });
        // Перенаправляем пользователя после удаления
        return { success: true, redirect: '/projects' };
      } else {
        // Для обычных пользователей - создаем запись в логах
        await prisma.log.create({
          data: {
            action: `Запрос на удаление модели ${modelId}`,
            userId: user.id,
            modelId: modelId
          }
        });
        return { success: true, message: 'Запрос на удаление отправлен администратору' };
      }
    } catch (error) {
      console.error('Ошибка при удалении:', error);
      return { success: false, error: 'Ошибка при удалении' };
    }
  };


  return (
    <div className="container mx-auto py-8">
      <ModelCard model={model} userRole={role} onDeleteRequest={handleDeleteRequest}/>
    </div>
  );
}