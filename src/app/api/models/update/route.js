// app/api/models/update/route.js
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveModelFile, deleteFile } from '@/lib/fileStorage'
import { syncModelFolder, sanitizeName } from '@/lib/nextcloud'
import { getUserFromSession } from '@/lib/auth'
import { logModelAction } from '@/lib/logger'
import { checkPermission } from '@/lib/permission'
import { ALL_PERMISSIONS } from '@/lib/roles'

export async function POST(request) {
  const user = await getUserFromSession()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Проверка общих прав на редактирование
  const canEditModels = checkPermission(user, ALL_PERMISSIONS.EDIT_MODELS)
  const canEditDescription = checkPermission(user, ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION)
  const canEditSphere = checkPermission(user, ALL_PERMISSIONS.EDIT_MODEL_SPHERE)
  const canEditScreenshots = checkPermission(user, ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS)

  if (!canEditModels && !canEditDescription && !canEditSphere && !canEditScreenshots) {
    return NextResponse.json(
      { error: 'Доступ запрещен. У вас нет прав для редактирования моделей, описаний, сфер или скриншотов.' },
      { status: 403 }
    )
  }

  try {
    const formData = await request.formData()
    const projectIds = formData.getAll('projectIds')
    const id = formData.get('id')
    const version = formData.get('version')
    const deletedScreenshots = formData.getAll('deletedScreenshots')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID модели обязательно' },
        { status: 400 }
      )
    }

    // Получаем текущую модель
    const existingModel = await prisma.model.findUnique({
      where: { id: String(id) },
      include: {
        projects: true,
        author: true,
        sphere: true
      }
    })

    if (!existingModel) {
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      )
    }

    // Инициализируем updateData только с теми полями, которые разрешено менять
    const updateData = {}
    const changes = []

    // Обработка описания (может быть изменено с правом EDIT_MODEL_DESCRIPTION)
    const newDescription = formData.get('description')
    if (newDescription !== null && newDescription !== existingModel.description) {
      if (canEditModels || canEditDescription) {
        updateData.description = newDescription
        changes.push('Обновлено описание')
      } else {
        return NextResponse.json(
          { error: 'Доступ запрещен. У вас нет прав для изменения описания модели.' },
          { status: 403 }
        )
      }
    }

    // Все остальные поля требуют права EDIT_MODELS или соответствующих отдельных прав
    if (canEditModels) {
      // Удаляем скриншоты, которые были помечены на удаление
      if (deletedScreenshots.length > 0) {
        await Promise.all(
          deletedScreenshots.map(url => deleteFile(url))
        )
        
        // Обновляем список изображений, исключая удаленные
        const updatedImages = existingModel.images.filter(
          image => !deletedScreenshots.includes(image)
        )
        
        await prisma.model.update({
          where: { id: String(id) },
          data: { images: updatedImages }
        })
      }

      // Подготовка данных для обновления
      let authorId = formData.get('authorId') || existingModel.authorId
      // Обрабатываем специальные значения: "UNKNOWN" и "EXTERNAL" как null
      if (authorId === 'UNKNOWN' || authorId === 'EXTERNAL' || authorId === '') {
        authorId = null
      }
      
      const newTitle = formData.get('title')
      if (newTitle !== null && newTitle !== existingModel.title) {
        updateData.title = newTitle
        changes.push(`Название: "${existingModel.title}" → "${newTitle}"`)

        const oldFolder = sanitizeName(existingModel.title)
        const newFolder = sanitizeName(newTitle)
        if (!updateData.fileUrl && existingModel.fileUrl) {
          updateData.fileUrl = existingModel.fileUrl.replace(
            `/models/${oldFolder}/`,
            `/models/${newFolder}/`
          )
        }
        if (!updateData.images) {
          const currentImages = existingModel.images.filter(img => !deletedScreenshots.includes(img))
          updateData.images = currentImages.map(img =>
            img.replace(`/models/${oldFolder}/`, `/models/${newFolder}/`)
          )
        } else {
          updateData.images = updateData.images.map(img =>
            img.replace(`/models/${oldFolder}/`, `/models/${newFolder}/`)
          )
        }
      }
      
      updateData.authorId = authorId
      
      // Сравниваем проекты
      const currentProjectIds = existingModel.projects.map(p => p.id).sort()
      const newProjectIds = [...projectIds].sort()
      
      if (JSON.stringify(currentProjectIds) !== JSON.stringify(newProjectIds)) {
        // Получаем названия проектов для лога
        const currentProjects = existingModel.projects.map(p => p.name).join(', ') || 'нет'
        const newProjects = await prisma.project.findMany({
          where: { id: { in: newProjectIds } }
        })
        const newProjectNames = newProjects.map(p => p.name).join(', ') || 'нет'
        
        changes.push(`Проекты: "${currentProjects}" → "${newProjectNames}"`)
        
        // Добавляем связь с проектами
        updateData.projects = {
          set: newProjectIds.map(id => ({ id }))
        }
      }
      
      if (authorId !== existingModel.authorId) {
        const newAuthor = await prisma.user.findUnique({
          where: { id: authorId }
        })
        changes.push(
          `Автор: "${existingModel.author?.name || 'нет'}" → "${newAuthor?.name || 'нет'}"`
        )
      }
      
      // Обработка ZIP-файла
      const zipFile = formData.get('zipFile')
      const deleteZipFile = formData.get('deleteZipFile')
      
      if (deleteZipFile === 'true') {
        if (existingModel.fileUrl) {
          await deleteFile(existingModel.fileUrl)
          updateData.fileUrl = null
          changes.push('Удалён файл модели')
        }
      } else if (zipFile && zipFile.size > 0) {
        if (existingModel.fileUrl) {
          await deleteFile(existingModel.fileUrl)
        }
        const fileName = zipFile.name || ''
        if (!fileName.toLowerCase().endsWith('.zip')) {
          return NextResponse.json(
            { error: 'Можно загружать только .zip файлы!' },
            { status: 400 }
          )
        }
        updateData.fileUrl = await saveModelFile(zipFile, newTitle || existingModel.title, version || 'current')
        changes.push('Обновлён файл модели')
      }
      
      // Обработка новых скриншотов
      const screenshots = formData.getAll('screenshots')
      if (screenshots.length > 0) {
        const isValidImageFile = (file) => {
          if (!file || typeof file.arrayBuffer !== 'function') return false
          const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
          if (!validMimeTypes.includes(file.type?.toLowerCase())) {
            return false
          }
          const fileName = (file.name || '').toLowerCase()
          const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
          return validExtensions.some(ext => fileName.endsWith(ext))
        }

        for (const file of screenshots) {
          if (!isValidImageFile(file)) {
            return NextResponse.json(
              { error: `Файл "${file.name || 'неизвестный'}" не является изображением. Разрешены только: JPG, PNG, GIF, WEBP, BMP` },
              { status: 400 }
            )
          }
        }

        const newScreenshots = await Promise.all(
          screenshots.map(file => saveModelFile(file, newTitle || existingModel.title, version || 'current', true))
        )

        const currentImages = existingModel.images
          ? existingModel.images.filter(image => !deletedScreenshots.includes(image))
          : []

        updateData.images = [
          ...currentImages,
          ...newScreenshots
        ]
        changes.push(`Добавлено ${screenshots.length} скриншотов`)
      }
    } else {
      // Если нет права EDIT_MODELS, но есть права на отдельные поля
      // Обработка изменения сферы
      const newSphereId = formData.get('sphereId')
      if (newSphereId !== null && newSphereId !== existingModel.sphereId) {
        if (canEditSphere) {
          let oldSphereName = 'Не указана'
          let newSphereName = 'Не указана'
          
          if (existingModel.sphere) {
            oldSphereName = existingModel.sphere.name
          }
          
          if (newSphereId) {
            const newSphere = await prisma.sphere.findUnique({
              where: { id: newSphereId }
            })
            if (newSphere) {
              newSphereName = newSphere.name
            }
          }
          
          changes.push(`Сфера: "${oldSphereName}" → "${newSphereName}"`)
          updateData.sphereId = newSphereId
        } else {
          return NextResponse.json(
            { error: 'Доступ запрещен. У вас нет прав для изменения сферы модели.' },
            { status: 403 }
          )
        }
      }
      
      // Обработка скриншотов
      if (canEditScreenshots) {
        // Удаляем скриншоты, которые были помечены на удаление
        if (deletedScreenshots.length > 0) {
          await Promise.all(
            deletedScreenshots.map(url => deleteFile(url))
          )
          
          // Обновляем список изображений, исключая удаленные
          const updatedImages = existingModel.images.filter(
            image => !deletedScreenshots.includes(image)
          )
          
          await prisma.model.update({
            where: { id: String(id) },
            data: { images: updatedImages }
          })
          changes.push(`Удалено ${deletedScreenshots.length} скриншотов`)
        }
        
        // Обработка новых скриншотов
        const screenshots = formData.getAll('screenshots')
        if (screenshots.length > 0) {
          const isValidImageFile = (file) => {
            if (!file || typeof file.arrayBuffer !== 'function') return false
            const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
            if (!validMimeTypes.includes(file.type?.toLowerCase())) {
              return false
            }
            const fileName = (file.name || '').toLowerCase()
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
            return validExtensions.some(ext => fileName.endsWith(ext))
          }

          for (const file of screenshots) {
            if (!isValidImageFile(file)) {
              return NextResponse.json(
                { error: `Файл "${file.name || 'неизвестный'}" не является изображением. Разрешены только: JPG, PNG, GIF, WEBP, BMP` },
                { status: 400 }
              )
            }
          }

          const newScreenshots = await Promise.all(
            screenshots.map(file => saveModelFile(file, existingModel.title, version || 'current', true))
          )

          const currentImages = existingModel.images
            ? existingModel.images.filter(image => !deletedScreenshots.includes(image))
            : []

          updateData.images = [
            ...currentImages,
            ...newScreenshots
          ]
          changes.push(`Добавлено ${screenshots.length} скриншотов`)
        }
      }
    }
    
    // Обработка изменения сферы (если не обработано выше, но есть право EDIT_MODELS)
    if (canEditModels) {
      const newSphereId = formData.get('sphereId')
      if (newSphereId !== null && newSphereId !== existingModel.sphereId && !updateData.sphereId) {
        let oldSphereName = 'Не указана'
        let newSphereName = 'Не указана'
        
        if (existingModel.sphere) {
          oldSphereName = existingModel.sphere.name
        }
        
        if (newSphereId) {
          const newSphere = await prisma.sphere.findUnique({
            where: { id: newSphereId }
          })
          if (newSphere) {
            newSphereName = newSphere.name
          }
        }
        
        changes.push(`Сфера: "${oldSphereName}" → "${newSphereName}"`)
        updateData.sphereId = newSphereId
      }
    }


    // Обновление модели
  const updatedModel = await prisma.model.update({
    where: { id: String(id) },
    data: updateData,
    include: {
      projects: true,
      author: true,
      sphere: true
    }
  })

  await syncModelFolder(updatedModel, existingModel.title)

    if (version) {
      await prisma.modelVersion.create({
        data: {
          modelId: updatedModel.id,
          version,
          fileUrl: updatedModel.fileUrl,
          images: updatedModel.images
        }
      })
    }

    // Создаём запись в логах, если были изменения
    if (changes.length > 0) {
      await logModelAction(
        `Обновлена модель: ${changes.join(', ')}`,
        updatedModel.id,
        user.id
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedModel,
      changes: changes.length > 0 ? changes : 'Нет изменений'
    })

  } catch (err) {
    console.error('[Ошибка обновления модели]', err)
    
    // Определяем понятное сообщение об ошибке
    let errorMessage = 'Ошибка при обновлении модели'
    
    if (err.message) {
      if (err.message.includes('Nextcloud') || err.message.includes('конфигурация')) {
        errorMessage = err.message
      } else if (err.message.includes('подключиться')) {
        errorMessage = err.message
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
        errorMessage = 'Не удается подключиться к серверу хранения файлов (Nextcloud). Убедитесь, что сервис запущен.'
      } else {
        errorMessage = err.message || 'Ошибка сервера'
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}