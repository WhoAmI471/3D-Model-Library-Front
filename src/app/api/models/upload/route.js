import { v4 as uuidv4 } from 'uuid'
import { saveModelFile } from '@/lib/fileStorage'
import { syncModelFolder } from '@/lib/nextcloud'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { logModelAction } from '@/lib/logger'

export async function POST(request) {
  const user = await getUserFromSession()
  if (!user) return new Response('Unauthorized', { status: 401 })

  try {
    const formData = await request.formData()
    const projectIds = formData.getAll('projectIds')

    const zipFile = formData.get('zipFile')
    const title = formData.get('title') || ''
    const description = formData.get('description') || ''
    let authorId = formData.get('authorId') || null
    // Обрабатываем специальные значения: "UNKNOWN" и "EXTERNAL" как null
    if (authorId === 'UNKNOWN' || authorId === 'EXTERNAL' || authorId === '') {
      authorId = null
    }
    const projectId = formData.get('projectId') || null
    const sphere = formData.get('sphere') || ''
    const version = formData.get('version') || '1.0'
    const screenshots = formData.getAll('screenshots') || []

    if (!zipFile || !title || !sphere || typeof zipFile.arrayBuffer !== 'function') {
      return new Response(JSON.stringify({ error: 'Обязательные поля отсутствуют или файл некорректен' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Проверка расширения файла - только .zip
    const fileName = zipFile.name || ''
    if (!fileName.toLowerCase().endsWith('.zip')) {
      return new Response(JSON.stringify({ error: 'Можно загружать только .zip файлы!' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const validSpheres = ['CONSTRUCTION', 'CHEMISTRY', 'INDUSTRIAL', 'MEDICAL', 'OTHER']
    if (!validSpheres.includes(sphere.toUpperCase())) {
      return new Response(JSON.stringify({ error: 'Неверная сфера применения' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const modelId = uuidv4()

    const fileUrl = await saveModelFile(zipFile, title, version)

    // Проверка типа файлов для скриншотов
    const isValidImageFile = (file) => {
      if (!file || typeof file.arrayBuffer !== 'function') return false
      
      // Проверка MIME типа
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
      if (!validMimeTypes.includes(file.type?.toLowerCase())) {
        return false
      }
      
      // Проверка расширения файла
      const fileName = (file.name || '').toLowerCase()
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
      return validExtensions.some(ext => fileName.endsWith(ext))
    }

    const imageUrls = []
    for (const file of screenshots) {
      if (!isValidImageFile(file)) {
        return new Response(JSON.stringify({ 
          error: `Файл "${file.name || 'неизвестный'}" не является изображением. Разрешены только: JPG, PNG, GIF, WEBP, BMP` 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const url = await saveModelFile(file, title, version, true)
      imageUrls.push(url)
    }

    const newModel = await prisma.model.create({
      data: {
        id: modelId,
        title,
        description,
        fileUrl,
        images: imageUrls,
        authorId: authorId || null,
        sphere: sphere.toUpperCase(),
        projects: {
          connect: projectIds.map(id => ({ id }))
        },
      },
      include: { projects: true }
    })

    await prisma.modelVersion.create({
      data: {
        modelId: newModel.id,
        version,
        fileUrl,
        images: imageUrls
      }
    })

    await logModelAction(
      `Добавлена модель: ${title}`,
      modelId,
      authorId || null
    )

    await syncModelFolder({ title, projects: newModel.projects })

    const allModels = await prisma.model.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: true, projects: true },
    })

    return new Response(JSON.stringify({ success: true, model: newModel, allModels }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Ошибка загрузки модели:', error)
    
    // Определяем понятное сообщение об ошибке
    let errorMessage = 'Ошибка при загрузке модели'
    
    if (error.message) {
      if (error.message.includes('Nextcloud') || error.message.includes('конфигурация')) {
        errorMessage = error.message
      } else if (error.message.includes('подключиться')) {
        errorMessage = error.message
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        errorMessage = 'Не удается подключиться к серверу хранения файлов (Nextcloud). Убедитесь, что сервис запущен.'
      } else {
        errorMessage = `Ошибка при загрузке модели: ${error.message}`
      }
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
