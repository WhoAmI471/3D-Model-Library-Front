'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatFileSize, proxyUrl } from '@/lib/utils'
import { checkPermission } from '@/lib/permission'
import { ALL_PERMISSIONS, ROLES } from '@/lib/roles'
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useModelsData } from '@/hooks/useModelsData'

export default function ModelEditForm({ id, userRole }) {
  const router = useRouter()
  const { users, projects, spheres, models: allModels, currentUser, isLoading: isLoadingData } = useModelsData({ includeUsers: true, includeProjects: true })
  const [form, setForm] = useState({
    title: '',
    description: '',
    authorId: '',
    version: '',
    sphereId: '',
  })
  const [selectedProjects, setSelectedProjects] = useState([])
  const [zipFile, setZipFile] = useState(null)
  const [screenshots, setScreenshots] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentFiles, setCurrentFiles] = useState({
    zip: null,
    screenshots: []
  })
  const [deletedScreenshots, setDeletedScreenshots] = useState([])
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  const [existingModel, setExistingModel] = useState(null)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [draggedType, setDraggedType] = useState(null) // 'current' или 'new'

  
  const [canEditModel, setCanEditModel] = useState(null);
  const [canEditDescription, setCanEditDescription] = useState(null);
  const [canEditSphere, setCanEditSphere] = useState(null);
  const [canEditScreenshots, setCanEditScreenshots] = useState(null);

  // Устанавливаем права доступа на основе объекта пользователя
  useEffect(() => {
    if (currentUser) {
      setCanEditModel(checkPermission(currentUser, ALL_PERMISSIONS.EDIT_MODELS))
      setCanEditDescription(checkPermission(currentUser, ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION))
      setCanEditSphere(checkPermission(currentUser, ALL_PERMISSIONS.EDIT_MODEL_SPHERE))
      setCanEditScreenshots(checkPermission(currentUser, ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS))
    } else {
      setCanEditModel(false)
      setCanEditDescription(false)
      setCanEditSphere(false)
      setCanEditScreenshots(false)
    }
  }, [currentUser])

  // Сортировка сфер: по количеству моделей, "Другое" в конце
  const sortedSpheres = [...spheres].sort((a, b) => {
    const aCount = allModels.filter(model => model.sphere?.id === a.id).length
    const bCount = allModels.filter(model => model.sphere?.id === b.id).length
    
    // Если одна из сфер называется "Другое", она идет в конец
    if (a.name === 'Другое') return 1
    if (b.name === 'Другое') return -1
    
    // Остальные сортируем по количеству моделей (от большего к меньшему)
    return bCount - aCount
  })

  useEffect(() => {
    if (!currentUser) return // Ждем загрузки текущего пользователя
    
    const loadModel = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/models/${id}?include=projects`)
        if (!res.ok) throw new Error('Не удалось загрузить модель')
        const data = await res.json()
        
        // Обрабатываем authorId: если null, используем текущего пользователя для админа, иначе 'UNKNOWN'
        // Для админа сохраняем реальный ID автора (если есть), иначе устанавливаем текущего пользователя
        // Для других пользователей: если authorId есть и это текущий пользователь - используем его ID, иначе 'EXTERNAL'
        let authorIdValue = currentUser?.role === 'ADMIN' ? (currentUser.id || 'UNKNOWN') : 'UNKNOWN'
        if (data.authorId) {
          if (currentUser?.role === 'ADMIN') {
            // Для админа сохраняем реальный ID автора
            authorIdValue = data.authorId
          } else if (currentUser && data.authorId === currentUser.id) {
            authorIdValue = currentUser.id
          } else {
            authorIdValue = 'EXTERNAL'
          }
        }
        
        // Получаем текущую версию модели (последняя версия из списка или 1.0 по умолчанию)
        let currentVersion = '1.0'
        if (data.versions && data.versions.length > 0) {
          // Сортируем версии по дате создания (последняя первая)
          const sortedVersions = [...data.versions].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          )
          currentVersion = sortedVersions[0].version
        }
        
        setForm({
          title: data.title || '',
          description: data.description || '',
          authorId: authorIdValue,
          version: currentVersion,
          sphereId: data.sphere?.id || '',
        })
        
        setSelectedProjects(data.projects?.map(p => p.id) || [])
        
        setCurrentFiles({
          zip: data.fileUrl,
          screenshots: data.images || []
        })
        
        setExistingModel(data)
        
      } catch (err) {
        console.error('Ошибка загрузки модели:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (id && currentUser !== null) loadModel()
  }, [id, currentUser])

  // Очистка blob URL при размонтировании
  useEffect(() => {
    return () => {
      currentFiles.screenshots.forEach(file => {
        if (typeof file === 'object' && file.preview && file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview)
        }
      })
      screenshots.forEach(file => {
        if (file.preview && file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const toggleProject = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  const isValidImageFile = (file) => {
    // Проверка MIME типа
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!validMimeTypes.includes(file.type.toLowerCase())) {
      return false
    }
    
    // Проверка расширения файла
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    
    return hasValidExtension
  }

  const handleScreenshotAdd = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      const validFiles = []
      const invalidFiles = []
      
      files.forEach(file => {
        if (isValidImageFile(file)) {
          validFiles.push(file)
        } else {
          invalidFiles.push(file.name)
        }
      })
      
      if (invalidFiles.length > 0) {
        alert(`Следующие файлы не являются изображениями и не будут добавлены:\n${invalidFiles.join('\n')}\n\nРазрешены только изображения: JPG, PNG, GIF, WEBP, BMP`)
      }
      
      if (validFiles.length > 0) {
        setScreenshots(prev => [...prev, ...validFiles])
      }
      
      // Очищаем input, чтобы можно было выбрать тот же файл снова
      e.target.value = ''
    }
  }

  const removeScreenshot = (index) => {
    setScreenshots(prev => {
      const newScreenshots = [...prev]
      newScreenshots.splice(index, 1)
      return newScreenshots
    })
  }

  // Функции для drag and drop скриншотов (работают с объединенным списком)
  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    // Определяем, из какого массива был взят элемент и куда он попадает
    const draggedIsCurrent = draggedIndex < currentFiles.screenshots.length
    const dropIsCurrent = dropIndex < currentFiles.screenshots.length
    
    // Если перетаскивание внутри одного массива
    if (draggedIsCurrent && dropIsCurrent) {
      // Перетаскивание внутри существующих скриншотов
      setCurrentFiles(prev => {
        const newScreenshots = [...prev.screenshots]
        const draggedItem = newScreenshots[draggedIndex]
        newScreenshots.splice(draggedIndex, 1)
        newScreenshots.splice(dropIndex, 0, draggedItem)
        return { ...prev, screenshots: newScreenshots }
      })
    } else if (!draggedIsCurrent && !dropIsCurrent) {
      // Перетаскивание внутри новых скриншотов
      const adjustedDraggedIndex = draggedIndex - currentFiles.screenshots.length
      const adjustedDropIndex = dropIndex - currentFiles.screenshots.length
      setScreenshots(prev => {
        const newScreenshots = [...prev]
        const draggedItem = newScreenshots[adjustedDraggedIndex]
        newScreenshots.splice(adjustedDraggedIndex, 1)
        newScreenshots.splice(adjustedDropIndex, 0, draggedItem)
        return newScreenshots
      })
    } else {
      // Перетаскивание между массивами - перемещаем элемент из одного в другой
      if (draggedIsCurrent && !dropIsCurrent) {
        // Из существующих в новые
        const draggedItem = currentFiles.screenshots[draggedIndex]
        const adjustedDropIndex = dropIndex - currentFiles.screenshots.length
        
        setCurrentFiles(prev => {
          const newScreenshots = [...prev.screenshots]
          newScreenshots.splice(draggedIndex, 1)
          return { ...prev, screenshots: newScreenshots }
        })
        
        // Создаем File объект из URL (это сложно, поэтому лучше не поддерживать такое перемещение)
        // Вместо этого просто перемещаем внутри массивов
        console.warn('Перемещение между существующими и новыми скриншотами не поддерживается')
      } else {
        // Из новых в существующие - аналогично, не поддерживаем
        console.warn('Перемещение между новыми и существующими скриншотами не поддерживается')
      }
    }

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Отдельные функции для перетаскивания только существующих скриншотов
  const handleCurrentDragStart = (index) => {
    setDraggedIndex(index)
    setDraggedType('current')
  }

  const handleCurrentDragOver = (e, index) => {
    e.preventDefault()
    if (draggedType === 'current') {
      setDragOverIndex(index)
    }
  }

  const handleCurrentDragLeave = () => {
    if (draggedType === 'current') {
      setDragOverIndex(null)
    }
  }

  const handleCurrentDrop = (e, dropIndex) => {
    e.preventDefault()
    
    if (draggedType !== 'current' || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      setDraggedType(null)
      return
    }

    setCurrentFiles(prev => {
      const newScreenshots = [...prev.screenshots]
      const draggedItem = newScreenshots[draggedIndex]
      newScreenshots.splice(draggedIndex, 1)
      newScreenshots.splice(dropIndex, 0, draggedItem)
      return { ...prev, screenshots: newScreenshots }
    })

    setDraggedIndex(null)
    setDragOverIndex(null)
    setDraggedType(null)
  }

  // Отдельные функции для перетаскивания только новых скриншотов
  const handleNewDragStart = (index) => {
    setDraggedIndex(index)
    setDraggedType('new')
  }

  const handleNewDragOver = (e, index) => {
    e.preventDefault()
    if (draggedType === 'new') {
      setDragOverIndex(index)
    }
  }

  const handleNewDragLeave = () => {
    if (draggedType === 'new') {
      setDragOverIndex(null)
    }
  }

  const handleNewDrop = (e, dropIndex) => {
    e.preventDefault()
    
    if (draggedType !== 'new' || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      setDraggedType(null)
      return
    }

    setScreenshots(prev => {
      const newScreenshots = [...prev]
      const draggedItem = newScreenshots[draggedIndex]
      newScreenshots.splice(draggedIndex, 1)
      newScreenshots.splice(dropIndex, 0, draggedItem)
      return newScreenshots
    })

    setDraggedIndex(null)
    setDragOverIndex(null)
    setDraggedType(null)
  }

  const removeCurrentScreenshot = (index) => {
    setCurrentFiles(prev => {
      const newScreenshots = [...prev.screenshots]
      if (index < 0 || index >= newScreenshots.length) {
        return prev // Защита от неверного индекса
      }
      const deletedScreenshot = newScreenshots[index]
      // Получаем оригинальный URL для удаления
      const originalUrl = typeof deletedScreenshot === 'string' ? deletedScreenshot : (deletedScreenshot?.originalUrl || deletedScreenshot)
      
      if (!originalUrl) {
        return prev // Если URL не найден, не удаляем
      }
      
      // Удаляем скриншот из массива
      newScreenshots.splice(index, 1)
      
      // Добавляем в список удаленных только если его там еще нет
      setDeletedScreenshots(prevDeleted => {
        if (!prevDeleted.includes(originalUrl)) {
          return [...prevDeleted, originalUrl]
        }
        return prevDeleted
      })
      
      return { ...prev, screenshots: newScreenshots }
    })
  }

  const restoreDeletedScreenshot = (deletedUrl) => {
    // Удаляем из списка удаленных
    setDeletedScreenshots(prevDeleted => prevDeleted.filter(url => url !== deletedUrl))
    // Возвращаем в список текущих скриншотов
    setCurrentFiles(prev => ({
      ...prev,
      screenshots: [...prev.screenshots, deletedUrl]
    }))
  }

  // Функция для проверки валидности количества скриншотов
  const isValidScreenshotsCount = () => {
    // Если не редактируем скриншоты (ни через canEditModel, ни через canEditScreenshots), валидация не нужна
    if (!canEditModel && !canEditScreenshots) {
      return true
    }
    
    // Проверяем количество скриншотов
    const remainingCurrentScreenshots = currentFiles.screenshots.filter(
      screenshot => !deletedScreenshots.includes(screenshot)
    )
    const newScreenshotsCount = screenshots.length
    const totalScreenshots = remainingCurrentScreenshots.length + newScreenshotsCount
    
    return totalScreenshots >= 2
  }

  const handleSubmit = async (e) => {
  e.preventDefault()
  setIsLoading(true)
  setError(null)

  try {
    // Проверка количества скриншотов перед сохранением (только если редактируются скриншоты)
    if ((canEditModel || canEditScreenshots) && !isValidScreenshotsCount()) {
      setIsLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('id', id)
    
    // Если можно редактировать только описание, сферу или скриншоты (но не полную модель), отправляем соответствующие поля
    if (!canEditModel && (canEditDescription || canEditSphere || canEditScreenshots)) {
      if (canEditDescription) {
        formData.append('description', form.description)
      }
      if (canEditSphere) {
        formData.append('sphereId', form.sphereId || '')
      }
      if (canEditScreenshots) {
        // Добавляем информацию об удаленных скриншотах
        deletedScreenshots.forEach(url => {
          formData.append('deletedScreenshots', url)
        })
        // Отправляем порядок существующих скриншотов (после удаления удаленных)
        currentFiles.screenshots
          .filter(url => !deletedScreenshots.includes(url))
          .forEach(url => {
            formData.append('currentScreenshotUrls', url)
          })
        // Добавляем новые скриншоты
        screenshots.forEach(screenshot => formData.append('screenshots', screenshot))
      }
    } else {
      // Добавляем все поля формы
      for (const key in form) {
        formData.append(key, form[key])
      }
      
      // Добавляем выбранные проекты
      selectedProjects.forEach(projectId => {
        formData.append('projectIds', projectId)
      })
      
      // Добавляем информацию об удаленных скриншотах
      deletedScreenshots.forEach(url => {
        formData.append('deletedScreenshots', url)
      })
      
      // Отправляем порядок существующих скриншотов (после удаления удаленных)
      currentFiles.screenshots
        .filter(url => !deletedScreenshots.includes(url))
        .forEach(url => {
          formData.append('currentScreenshotUrls', url)
        })
      
      // Добавляем информацию об удалении ZIP-файла, если он был удален
      if (!currentFiles.zip && !zipFile && existingModel?.fileUrl) {
        formData.append('deleteZipFile', 'true')
      }
      
      // Добавляем новые файлы, если они были выбраны
      if (zipFile) formData.append('zipFile', zipFile)
      screenshots.forEach(screenshot => formData.append('screenshots', screenshot))
    }

    const response = await fetch('/api/models/update', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (response.ok && result.success) {
      // Возвращаемся на предыдущую страницу после успешного сохранения
      router.back()
    } else {
      throw new Error(result.error || 'Не удалось обновить модель')
    }
  } catch (err) {
    console.error('Ошибка обновления:', err)
    setError(err.message || 'Произошла ошибка')
  } finally {
    setIsLoading(false)
  }
}

  if (isLoading && !error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">Ошибка: {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()))

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Заголовок с редактируемым названием */}
        <div className="mb-6 pb-8 border-b border-gray-200 relative flex items-end gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="absolute -left-12 bottom-8 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="Назад"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
          {canEditModel ? (
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="text-2xl font-semibold text-gray-900 leading-none pb-0 w-full bg-transparent border-none focus:outline-none focus:ring-0 p-0"
              placeholder="Название модели"
              required
              maxLength={50}
            />
          ) : (
            <h1 className="text-2xl font-semibold text-gray-900 leading-none pb-0">
              {form.title || 'Редактирование модели'}
            </h1>
          )}
        </div>
      
      <form id="model-edit-form" onSubmit={handleSubmit} className="space-y-8">
        {canEditModel === true ? (
          <>
            {/* Галерея скриншотов */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Текущие скриншоты
            </label>
            {(currentFiles.screenshots.length > 0 || screenshots.length > 0) && (
              <div className="mb-2">
                <div className="text-xs text-gray-500 mb-2">
                  Первый скриншот будет отображаться в карточке модели. Перетаскивайте скриншоты для изменения порядка.
                </div>
              </div>
            )}
            <div className="flex gap-4 overflow-x-auto pb-2">
                {currentFiles.screenshots.map((file, index) => {
                  const totalIndex = index
                  const totalLength = currentFiles.screenshots.length + screenshots.length
                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleCurrentDragStart(index)}
                      onDragOver={(e) => handleCurrentDragOver(e, index)}
                      onDragLeave={handleCurrentDragLeave}
                      onDrop={(e) => handleCurrentDrop(e, index)}
                      className={`relative flex-shrink-0 w-64 h-48 cursor-move bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-all group ${
                        draggedType === 'current' && draggedIndex === index ? 'opacity-50 scale-95' : ''
                      } ${
                        draggedType === 'current' && dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-500 scale-105' : ''
                      } ${index === 0 ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <img
                        src={proxyUrl(file)}
                        alt={`Скриншот ${index + 1}`}
                        className="object-cover w-full h-full pointer-events-none"
                        draggable={false}
                      />
                      {index === 0 && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                          Главный
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeCurrentScreenshot(index)
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors z-10"
                        disabled={!canEditModel && !canEditScreenshots}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs font-medium rounded">
                        {totalIndex + 1} / {totalLength}
                      </div>
                    </div>
                  )
                })}
                {/* Новые скриншоты */}
                {screenshots.map((file, index) => {
                  const totalIndex = currentFiles.screenshots.length + index
                  const totalLength = currentFiles.screenshots.length + screenshots.length
                  // Новый скриншот может быть первым только если нет существующих скриншотов
                  const isFirst = currentFiles.screenshots.length === 0 && index === 0
                  return (
                    <div
                      key={`new-${index}`}
                      draggable
                      onDragStart={() => handleNewDragStart(index)}
                      onDragOver={(e) => handleNewDragOver(e, index)}
                      onDragLeave={handleNewDragLeave}
                      onDrop={(e) => handleNewDrop(e, index)}
                      className={`relative flex-shrink-0 w-64 h-48 cursor-move bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-all group ${
                        draggedType === 'new' && draggedIndex === index ? 'opacity-50 scale-95' : ''
                      } ${
                        draggedType === 'new' && dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-500 scale-105' : ''
                      } ${isFirst ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Новый скриншот ${index + 1}`}
                        className="object-cover w-full h-full pointer-events-none"
                        draggable={false}
                      />
                      {isFirst && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                          Главный
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeScreenshot(index)
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors z-10"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs font-medium rounded">
                        {totalIndex + 1} / {totalLength}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Кнопка добавления скриншотов */}
              <div className="mt-4">
                <label className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Добавить скриншоты
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleScreenshotAdd}
                    className="sr-only"
                    disabled={!canEditModel && !canEditScreenshots}
                  />
                </label>
              </div>
            </div>
            
            {/* Удаленные скриншоты (можно восстановить) */}
            {deletedScreenshots.length > 0 && (
              <div className="mb-8">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Удаленные скриншоты (можно восстановить)</div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {deletedScreenshots.map((deletedUrl, index) => (
                    <div key={`deleted-${deletedUrl}`} className="relative flex-shrink-0 w-64 h-48 bg-gray-100 rounded-lg overflow-hidden opacity-60 border-2 border-red-300">
                      <img
                        src={proxyUrl(deletedUrl)}
                        alt={`Удаленный скриншот ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => restoreDeletedScreenshot(deletedUrl)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-green-50 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Восстановить скриншот"
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Описание */}
            <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Описание</div>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={6}
                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                maxLength={1000}
                placeholder="Введите описание модели..."
              />
            </div>

            {/* Информация о модели */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              
              {/* Автор */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Автор</div>
                <select
                  name="authorId"
                  value={form.authorId || (currentUser ? currentUser.id : 'UNKNOWN')}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 ${
                    currentUser?.role === 'ADMIN' ? '' : 'bg-gray-50'
                  }`}
                  required
                  disabled={currentUser?.role !== 'ADMIN'}
                >
                  {currentUser?.role === 'ADMIN' ? (
                    <>
                      {currentUser && (
                        <option value={currentUser.id}>
                          {currentUser.name} (Я)
                        </option>
                      )}
                      <option value="UNKNOWN">Неизвестно</option>
                      <option value="EXTERNAL">Сторонняя модель</option>
                      {users
                        .filter(user => user.role === ROLES.ARTIST && user.id !== currentUser?.id)
                        .map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                    </>
                  ) : (
                    <>
                      {currentUser && (
                        <option value={currentUser.id}>
                          {currentUser.name} (Я)
                        </option>
                      )}
                      <option value="UNKNOWN">Неизвестно</option>
                      <option value="EXTERNAL">Сторонняя модель</option>
                    </>
                  )}
                </select>
              </div>
              
              {/* Версия */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Версия</div>
                <input
                  name="version"
                  value={form.version}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                  maxLength={20}
                />
              </div>
              
              {/* Сфера */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Сфера <span className="text-red-500">*</span></div>
                <select
                  name="sphereId"
                  value={form.sphereId || ''}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm cursor-pointer text-gray-900"
                  disabled={canEditModel ? false : !canEditSphere}
                  style={!form.sphereId ? { color: 'rgba(156, 163, 175, 0.7)' } : {}}
                >
                  <option value="" disabled hidden className="text-gray-400">
                    Выберите сферу
                  </option>
                  {sortedSpheres.map((sphere) => (
                    <option key={sphere.id} value={sphere.id} className="text-gray-900">
                      {sphere.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ZIP-архив модели */}
            <div className="mb-8">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">ZIP-архив модели</div>
              {currentFiles.zip && (
                <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Текущий файл: {currentFiles.zip.split('/').pop()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {currentFiles.zip ? 'Заменить ZIP-файл' : 'Выберите ZIP-файл'}
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const fileName = file.name.toLowerCase()
                        if (!fileName.endsWith('.zip')) {
                          alert('Можно загружать только .zip файлы!')
                          e.target.value = ''
                          return
                        }
                        setZipFile(file)
                        if (currentFiles.zip) {
                          setCurrentFiles(prev => ({ ...prev, zip: null }))
                        }
                      }
                    }}
                    className="sr-only"
                    disabled={!canEditModel}
                  />
                </label>
                {zipFile && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Новый файл: {zipFile.name} ({formatFileSize(zipFile.size)})
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Проекты */}
            <div className="mb-8">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Проекты</div>
              
              {/* Поиск проектов */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Поиск проектов..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  maxLength={50}
                />
              </div>
              
              {/* Список проектов */}
              <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-white border border-gray-200 rounded-lg">
                {filteredProjects.map(project => (
                  <div key={project.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`project-${project.id}`}
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => toggleProject(project.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor={`project-${project.id}`} className="ml-2 text-sm text-gray-700">
                      {project.name}{project.city ? ` • ${project.city}` : ''}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (canEditDescription === true || canEditSphere === true || canEditScreenshots === true) ? (
          /* Если можно редактировать описание, сферу или скриншоты, показываем соответствующие поля */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Описание */}
            {canEditDescription && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  maxLength={1000}
                />
              </div>
            )}
            
            {/* Сфера */}
            {canEditSphere && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сфера <span className="text-red-500">*</span>
                </label>
                <select
                  name="sphereId"
                  value={form.sphereId || ''}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                  style={!form.sphereId ? { color: 'rgba(156, 163, 175, 0.7)' } : { color: 'rgba(17, 24, 39, 1)' }}
                >
                  <option value="" disabled hidden>
                    Выберите сферу
                  </option>
                  {sortedSpheres.map((sphere) => (
                    <option key={sphere.id} value={sphere.id}>
                      {sphere.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Скриншоты */}
            {canEditScreenshots && (
              <>
                {/* Текущие скриншоты */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Текущие скриншоты
                  </label>
                  {currentFiles.screenshots.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-500 mb-2">
                        Первый скриншот будет отображаться в карточке модели. Перетаскивайте скриншоты для изменения порядка.
                      </div>
                    </div>
                  )}
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {currentFiles.screenshots.map((file, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={() => handleCurrentDragStart(index)}
                        onDragOver={(e) => handleCurrentDragOver(e, index)}
                        onDragLeave={handleCurrentDragLeave}
                        onDrop={(e) => handleCurrentDrop(e, index)}
                        className={`relative flex-shrink-0 w-64 h-48 cursor-move bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-all group ${
                          draggedType === 'current' && draggedIndex === index ? 'opacity-50 scale-95' : ''
                        } ${
                          draggedType === 'current' && dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-500 scale-105' : ''
                        } ${index === 0 ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <img
                          src={proxyUrl(file)}
                          alt={`Скриншот ${index + 1}`}
                          className="object-cover w-full h-full pointer-events-none"
                          draggable={false}
                        />
                        {index === 0 && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                            Главный
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeCurrentScreenshot(index)
                          }}
                          className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors z-10"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs font-medium rounded">
                          {index + 1} / {currentFiles.screenshots.length}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Удаленные скриншоты (можно восстановить) */}
                  {deletedScreenshots.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Удаленные скриншоты (можно восстановить)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {deletedScreenshots.map((deletedUrl, index) => (
                          <div key={`deleted-${deletedUrl}`} className="relative group">
                            <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-md overflow-hidden opacity-60 border-2 border-red-300">
                              <img
                                src={proxyUrl(deletedUrl)}
                                alt={`Удаленный скриншот ${index + 1}`}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="mt-1 text-xs text-gray-500 truncate">
                              {deletedUrl.split('/').pop()}
                            </div>
                            <button
                              type="button"
                              onClick={() => restoreDeletedScreenshot(deletedUrl)}
                              className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-green-50 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              title="Восстановить скриншот"
                            >
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Новые скриншоты */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Добавить новые скриншоты
                  </label>
                  
                  <div className="mt-2">
                    <label className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                      <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Добавить скриншоты
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleScreenshotAdd}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  
                  {/* Галерея добавленных скриншотов */}
                  {screenshots.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-gray-500 mb-2">
                        Перетаскивайте скриншоты для изменения порядка.
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {screenshots.map((file, index) => (
                          <div
                            key={index}
                            draggable
                            onDragStart={() => handleNewDragStart(index)}
                            onDragOver={(e) => handleNewDragOver(e, index)}
                            onDragLeave={handleNewDragLeave}
                            onDrop={(e) => handleNewDrop(e, index)}
                            className={`relative flex-shrink-0 w-64 h-48 cursor-move bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-all group ${
                              draggedType === 'new' && draggedIndex === index ? 'opacity-50 scale-95' : ''
                            } ${
                              draggedType === 'new' && dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-500 scale-105' : ''
                            } ${index === 0 && currentFiles.screenshots.length === 0 ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Новый скриншот ${index + 1}`}
                              className="object-cover w-full h-full pointer-events-none"
                              draggable={false}
                            />
                            {index === 0 && currentFiles.screenshots.length === 0 && (
                              <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                                Главный
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeScreenshot(index)
                              }}
                              className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors z-10"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs font-medium rounded">
                              {currentFiles.screenshots.length + index + 1} / {currentFiles.screenshots.length + screenshots.length}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-md">
            <p className="text-yellow-800">Загрузка прав доступа...</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {!isValidScreenshotsCount() && (canEditModel || canEditScreenshots) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              Скриншотов должно быть минимум 2. Загрузите еще или восстановите удаленные.
            </p>
          </div>
        )}
      </form>
      
      {/* Кнопки действий - закреплены внизу справа */}
      {(canEditModel === true || canEditDescription === true || canEditSphere === true || canEditScreenshots === true) && (
        <div className="sticky bottom-6 mt-8 flex justify-end z-10">
          <div className="flex gap-3 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              form="model-edit-form"
              disabled={isLoading || !isValidScreenshotsCount()}
              className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                (isLoading || !isValidScreenshotsCount()) ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
