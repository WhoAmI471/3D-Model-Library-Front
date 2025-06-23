import { prisma } from '@/lib/prisma'

export async function logModelAction(action, modelId = null, userId = null) {
  try {
    await prisma.log.create({
      data: {
        action,
        modelId,
        userId
      }
    })
  } catch (error) {
    console.error('[Ошибка записи лога]', error)
  }
}
