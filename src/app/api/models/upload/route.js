import { writeFile, mkdir } from 'fs/promises'
import path, { extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import prisma from '@/lib/prisma'
import { Sphere } from '@prisma/client'

export async function POST(req) {
  const formData = await req.formData()

  const zipFile = formData.get('zipFile') // Blob
  const title = formData.get('title')
  const description = formData.get('description')
  const authorId = formData.get('authorId')
  const projectId = formData.get('projectId')
  const sphere = formData.get('sphere')
  const screenshots = formData.getAll('screenshots') // Array of Blobs

  if (!zipFile || !title || !sphere) {
    return new Response(JSON.stringify({ error: 'Обязательные поля отсутствуют' }), { status: 400 })
  }

  const validSpheres = ['CONSTRUCTION', 'CHEMISTRY', 'INDUSTRIAL', 'MEDICAL', 'OTHER']
  if (!validSpheres.includes(sphere)) {
    return new Response(JSON.stringify({ error: 'Неверная сфера применения' }), { status: 400 })
  }
  
  const modelId = uuidv4()
  const modelFolder = path.join(process.cwd(), 'public/uploads/models', modelId)
  const screenshotFolder = path.join(modelFolder, 'screenshots')
  await mkdir(screenshotFolder, { recursive: true })

  // Сохраняем zip
  const zipPath = path.join(modelFolder, 'model.zip')
  await writeFile(zipPath, Buffer.from(await zipFile.arrayBuffer()))

  // Сохраняем скриншоты
  const imageUrls = []
  for (const file of screenshots) {
    const ext = extname(file.name)
    const filename = uuidv4() + ext
    const filePath = path.join(screenshotFolder, filename)
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()))
    imageUrls.push(`/uploads/models/${modelId}/screenshots/${filename}`)
  }

  const newModel = await prisma.model.create({
    data: {
      id: modelId,
      title,
      description,
      fileUrl: `/uploads/models/${modelId}/model.zip`,
      images: imageUrls,
      authorId: authorId || null,
      projectId: projectId || null,
      sphere,
    },
  })

  await prisma.log.create({
    data: {
      action: `Добавлена модель: ${title}`,
      userId: authorId || null,
      modelId: modelId,
    },
  })

  const allModels = await prisma.model.findMany({
    orderBy: { createdAt: 'desc' },
    include: { author: true, project: true },
  })

  return new Response(JSON.stringify({ success: true, model: newModel, allModels }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
