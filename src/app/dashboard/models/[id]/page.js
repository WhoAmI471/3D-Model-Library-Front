import { ModelCard } from '@/components/ModelCard';
import { prisma } from '@/lib/prisma';

export default async function ModelPage({ params }) {
  const model = await prisma.model.findUnique({
    where: { id: params.id },
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
  });

  if (!model) {
    return <div>Модель не найдена</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <ModelCard model={model} />
    </div>
  );
}