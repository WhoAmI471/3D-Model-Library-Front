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
    const sphereIds = formData.getAll('sphereIds') || []
    const version = formData.get('version') || '1.0'
    const screenshots = formData.getAll('screenshots') || []

    if (!zipFile || !title || typeof zipFile.arrayBuffer !== 'function') {
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

    // Определяем сферы для связи
    const finalSphereIds = [...sphereIds]
    
    // Проверяем, что сферы существуют в базе данных (если выбраны)
    if (finalSphereIds.length > 0) {
      const spheres = await prisma.sphere.findMany({
        where: { id: { in: finalSphereIds } }
      })
      
      if (spheres.length !== finalSphereIds.length) {
        return new Response(JSON.stringify({ error: 'Одна или несколько указанных сфер не найдены' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
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

    const modelData = {
      id: modelId,
      title,
      description,
      fileUrl,
      images: imageUrls,
      authorId: authorId || null,
      projects: {
        connect: projectIds.map(id => ({ id }))
      }
    }

    // Добавляем связи со сферами только если они выбраны
    if (finalSphereIds.length > 0) {
      modelData.spheres = {
        connect: finalSphereIds.map(id => ({ id }))
      }
    }

    const newModel = await prisma.model.create({
      data: modelData,
      include: { 
        projects: true,
        spheres: true
      }
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
      include: { 
        author: true, 
        projects: true,
        spheres: true
      },
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
