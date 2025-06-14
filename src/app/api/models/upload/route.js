import { writeFile, mkdir } from 'fs/promises'
import path, { extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
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
    const uploadRoot = path.join(process.cwd(), 'public', 'uploads', 'models', modelId)
    const screenshotsDir = path.join(uploadRoot, 'screenshots')

    await mkdir(screenshotsDir, { recursive: true })

    const zipPath = path.join(uploadRoot, 'model.zip')
    await writeFile(zipPath, Buffer.from(await zipFile.arrayBuffer()))

    const imageUrls = []

    for (const file of screenshots) {
      if (!file || typeof file.arrayBuffer !== 'function') continue
      const ext = extname(file.name) || '.png'
      const fileName = uuidv4() + ext
      const filePath = path.join(screenshotsDir, fileName)
      await writeFile(filePath, Buffer.from(await file.arrayBuffer()))
      imageUrls.push(`/uploads/models/${modelId}/screenshots/${fileName}`)
    }

    const newModel = await prisma.model.create({
      data: {
        id: modelId,
        title,
        description,
        // createdAt: new Date(),
        // updatedAt: new Date(),
        fileUrl: `/uploads/models/${modelId}/model.zip`,
        images: imageUrls,
        authorId: authorId || null,
        // projectId: projectId || null,
        sphere: sphere.toUpperCase(),
        projects: {
          connect: projectIds.map(id => ({ id }))
        },
      },
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
