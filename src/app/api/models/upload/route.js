// api/models/upload
import { PrismaClient } from '@prisma/client'
import { mkdir, writeFile } from 'fs/promises'
import { join, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false, // важное условие для multipart
  },
}

const prisma = new PrismaClient()

export async function POST(req) {
  const form = formidable({ multiples: true, keepExtensions: true })
  
  const data = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err)
      else resolve({ fields, files })
    })
  })

  const { title, description, authorId, projectId, sphere } = data.fields
  const zipFile = Array.isArray(data.files.zipFile) ? data.files.zipFile[0] : data.files.zipFile
  const images = Array.isArray(data.files.screenshots) ? data.files.screenshots : [data.files.screenshots]

  const modelId = uuidv4()
  const modelFolder = join(process.cwd(), 'public/uploads/models', modelId)
  await mkdir(join(modelFolder, 'screenshots'), { recursive: true })

  // Сохраняем zip
  const zipPath = join(modelFolder, 'model.zip')
  const zipData = fs.readFileSync(zipFile.filepath)
  await writeFile(zipPath, zipData)

  // Сохраняем скриншоты
  const imageUrls = []
  for (const image of images) {
    const ext = extname(image.originalFilename)
    const newPath = join(modelFolder, 'screenshots', image.newFilename + ext)
    await writeFile(newPath, fs.readFileSync(image.filepath))
    imageUrls.push(`/uploads/models/${modelId}/screenshots/${image.newFilename + ext}`)
  }

  // Запись в БД
  const newModel = await prisma.model.create({
    data: {
      id: modelId,
      title,
      description,
      fileUrl: `/uploads/models/${modelId}/model.zip`,
      images: imageUrls,
      authorId,
      projectId,
      sphere,
    },
  })

  // Добавление лога
  await prisma.log.create({
    data: {
      action: `Добавлена модель: ${title}`,
      userId: authorId,
      modelId: modelId,
    },
  })

  // Получение всех моделей после добавления
  const allModels = await prisma.model.findMany({
    orderBy: { createdAt: 'desc' },
    include: { author: true, project: true }, // если нужно
  })
  
  return new Response(JSON.stringify({
    success: true,
    model: newModel,
    allModels, // возвращаем все модели
  }), { status: 200 })
}
