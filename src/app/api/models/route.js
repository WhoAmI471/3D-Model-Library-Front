// /app/api/models/route.js
import prisma from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'


export async function GET(request) {
  const user = await getUserFromSession(request)
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const models = await prisma.model.findMany({
    include: {
      project: true,
      author: true,
    },
  })
  return Response.json(models)
}

// GET метод с фильтром
// export async function GET(request) {
//   const { searchParams } = new URL(request.url);
//   const markedForDeletion = searchParams.get('markedForDeletion') === 'true';

//   try {
//     const models = await prisma.model.findMany({
//       where: {
//         markedForDeletion: markedForDeletion || undefined
//       },
//       include: {
//         markedBy: {
//           select: {
//             id: true,
//             name: true,
//             email: true
//           }
//         },
//         project: true,
//         author: true
//       },
//       orderBy: {
//         updatedAt: 'desc'
//       }
//     });

//     return NextResponse.json(models);
//   } catch (error) {
//     console.error('Error fetching models:', error);
//     return NextResponse.json(
//       { error: 'Ошибка загрузки моделей' },
//       { status: 500 }
//     );
//   }
// }