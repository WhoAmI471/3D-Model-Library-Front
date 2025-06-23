import { v4 as uuidv4 } from 'uuid'
import { saveModelFile } from '@/lib/fileStorage'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'

export async function POST(request) {
  const user = await getUserFromSession()
  if (!user) return new Response('Unauthorized', { status: 401 })

  try {
    const formData = await request.formData()
    const projectIds = formData.getAll('projectIds')

    const zipFile = formData.get('zipFile')
    const title = formData.get('title') || ''
    const description = formData.get('description') || ''
    const authorId = formData.get('authorId') || null
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

    const validSpheres = ['CONSTRUCTION', 'CHEMISTRY', 'INDUSTRIAL', 'MEDICAL', 'OTHER']
    if (!validSpheres.includes(sphere.toUpperCase())) {
      return new Response(JSON.stringify({ error: 'Неверная сфера применения' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const modelId = uuidv4()

    const fileUrl = await saveModelFile(zipFile, modelId, version)

    const imageUrls = []
    for (const file of screenshots) {
      if (!file || typeof file.arrayBuffer !== 'function') continue
      const url = await saveModelFile(file, modelId, version, true)
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
    })

    await prisma.modelVersion.create({
      data: {
        modelId: newModel.id,
        version,
        fileUrl,
        images: imageUrls
      }
    })

    await prisma.log.create({
      data: {
        action: `Добавлена модель: ${title}`,
        modelId: modelId,
        userId: authorId || null,
      },
    })

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
    return new Response(JSON.stringify({ error: 'Ошибка сервера' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
