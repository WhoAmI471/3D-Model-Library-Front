// /app/api/models/route.js
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const markedForDeletion = searchParams.get('markedForDeletion') === 'true';

  try {
    const models = await prisma.model.findMany({
      where: markedForDeletion 
        ? { 
            markedForDeletion: true,
            markedById: { not: null } // Дополнительная проверка
          } 
        : {},
      include: {
        markedBy: true,
        author: true,
        projects: true
      },
      orderBy: markedForDeletion
        ? { markedAt: 'desc' }
        : { createdAt: 'desc' }
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки моделей' },
      { status: 500 }
    );
  }
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