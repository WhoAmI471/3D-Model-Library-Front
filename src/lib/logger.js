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

// Запись действий, связанных с проектами. Проекты не имеют собственной таблицы
// логов, поэтому сохраняем только текст действия и пользователя.
export async function logProjectAction(action, userId = null) {
  try {
    await prisma.log.create({
      data: {
        action,
        userId,
        modelId: null
      }
    })
  } catch (error) {
    console.error('[Ошибка записи лога]', error)
  }
}

// Запись действий, связанных с сотрудниками. Используем общую таблицу логов
// без привязки к модели, фиксируя только действие и пользователя.
export async function logEmployeeAction(action, userId = null) {
  try {
    await prisma.log.create({
      data: {
        action,
        userId,
        modelId: null
      }
    })
  } catch (error) {
    console.error('[Ошибка записи лога]', error)
  }
}

// Запись действий, связанных со сферами. Используем общую таблицу логов
// без привязки к модели, фиксируя только действие и пользователя.
export async function logSphereAction(action, userId = null) {
  try {
    await prisma.log.create({
      data: {
        action,
        userId,
        modelId: null
      }
    })
  } catch (error) {
    console.error('[Ошибка записи лога]', error)
  }
}