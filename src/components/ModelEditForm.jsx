'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatFileSize, proxyUrl } from '@/lib/utils'
import { checkPermission } from '@/lib/permission'
import { ALL_PERMISSIONS, ROLES } from '@/lib/roles'
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useModelsData } from '@/hooks/useModelsData'
import apiClient, { ApiError } from '@/lib/apiClient'
import { useNotification } from '@/hooks/useNotification'
import { useDebounce } from '@/hooks/useDebounce'
import { getErrorMessage, handleError } from '@/lib/errorHandler'
import ScreenshotsSection from '@/components/modelForm/ScreenshotsSection'
import ModelInfoSection from '@/components/modelForm/ModelInfoSection'
import ProjectsSection from '@/components/modelForm/ProjectsSection'
import SpheresSection from '@/components/modelForm/SpheresSection'
import FileUploadSection from '@/components/modelForm/FileUploadSection'
import { updateModelSchema } from '@/lib/validations/modelSchema'

export default function ModelEditForm({ id, userRole }) {
  const router = useRouter()
  const { users, projects, spheres, models: allModels, currentUser, isLoading: isLoadingData } = useModelsData({ includeUsers: true, includeProjects: true })
  const { success, error: showError } = useNotification()
  
  const [selectedProjects, setSelectedProjects] = useState([])
  const [selectedSpheres, setSelectedSpheres] = useState([])
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
  const [sphereSearchTerm, setSphereSearchTerm] = useState('')
  const [existingModel, setExistingModel] = useState(null)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [draggedType, setDraggedType] = useState(null) // 'current' или 'new'
  const [isCheckingTitle, setIsCheckingTitle] = useState(false)
  const [titleExists, setTitleExists] = useState(false)
  
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset
  } = useForm({
    resolver: zodResolver(updateModelSchema),
    defaultValues: {
      title: '',
      description: '',
      authorId: '',
      version: '1.0',
      sphereIds: [],
      projectIds: []
    },
    mode: 'onChange'
  })
  
  const formData = watch()
  const debouncedTitle = useDebounce(formData.title, 500)

  // Проверка уникальности названия модели при редактировании
  useEffect(() => {
    const checkTitleUniqueness = async () => {
      const title = debouncedTitle?.trim()
      const originalTitle = existingModel?.title?.trim()
      
      // Очищаем ошибку, если поле пустое
      if (!title || title.length === 0) {
        setTitleExists(false)
        setIsCheckingTitle(false)
        return
      }

      // Не проверяем, если название не изменилось
      if (title === originalTitle) {
        setTitleExists(false)
        setIsCheckingTitle(false)
        return
      }

      // Не проверяем, если название слишком короткое
      if (title.length < 1) {
        setTitleExists(false)
        setIsCheckingTitle(false)
        return
      }

      setIsCheckingTitle(true)
      try {
        const result = await apiClient.models.checkTitle(title, id)
        if (result.exists) {
          setTitleExists(true)
        } else {
          setTitleExists(false)
        }
      } catch (error) {
        console.error('Ошибка проверки названия модели:', error)
        // При ошибке не блокируем ввод
        setTitleExists(false)
      } finally {
        setIsCheckingTitle(false)
      }
    }

    if (existingModel) {
      checkTitleUniqueness()
    }
  }, [debouncedTitle, existingModel, id])

  
  const [canEditModel, setCanEditModel] = useState(null);
  const [canEditDescription, setCanEditDescription] = useState(null);
  const [canEditSphere, setCanEditSphere] = useState(null);
  const [canEditScreenshots, setCanEditScreenshots] = useState(null);

  // Устанавливаем права доступа на основе объекта пользователя
  // EDIT_MODELS включает редактирование описания и скриншотов
  // Отдельные права оставлены для обратной совместимости
  useEffect(() => {
    if (currentUser) {
      const hasEditModels = checkPermission(currentUser, ALL_PERMISSIONS.EDIT_MODELS)
      const hasEditDescription = checkPermission(currentUser, ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION) // Устаревшее
      const hasEditScreenshots = checkPermission(currentUser, ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS) // Устаревшее
      
      setCanEditModel(hasEditModels)
      // EDIT_MODELS включает редактирование описания и скриншотов
      setCanEditDescription(hasEditModels || hasEditDescription)
      setCanEditSphere(checkPermission(currentUser, ALL_PERMISSIONS.EDIT_MODEL_SPHERE))
      setCanEditScreenshots(hasEditModels || hasEditScreenshots)
    } else {
      setCanEditModel(false)
      setCanEditDescription(false)
      setCanEditSphere(false)
      setCanEditScreenshots(false)
    }
  }, [currentUser])

  // Функция для загрузки и обновления данных модели
  const loadModel = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true)
      const data = await apiClient.models.getById(id, { include: 'projects' })
      
      // Обрабатываем authorId: только художники могут быть авторами
      // Если authorId указывает на не-художника или null, устанавливаем 'EXTERNAL'
      let authorIdValue
      if (data.authorId) {
        // Проверяем, является ли автор художником
        // Если data.author есть и его роль ARTIST, используем authorId
        // Иначе устанавливаем 'EXTERNAL'
        if (data.author && data.author.role === 'ARTIST') {
          authorIdValue = data.authorId
        } else {
          // Если автор не художник, устанавливаем 'EXTERNAL'
          authorIdValue = 'EXTERNAL'
        }
      } else {
        // Если authorId null, устанавливаем 'EXTERNAL'
        authorIdValue = 'EXTERNAL'
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
      
      reset({
        title: data.title || '',
        description: data.description || '',
        authorId: authorIdValue,
        version: currentVersion,
        sphereIds: data.spheres?.map(s => s.id) || [],
        projectIds: data.projects?.map(p => p.id) || []
      })
      
      setSelectedProjects(data.projects?.map(p => p.id) || [])
      setSelectedSpheres(data.spheres?.map(s => s.id) || [])
      
      setCurrentFiles({
        zip: data.fileUrl,
        screenshots: data.images || []
      })
      
      setExistingModel(data)
      
      // Очищаем новые скриншоты и удаленные после перезагрузки
      setScreenshots([])
      setDeletedScreenshots([])
      
    } catch (err) {
      console.error('Ошибка загрузки модели:', err)
      const formattedError = await handleError(err, { context: 'ModelEditForm.loadModel', modelId: id })
      setError(getErrorMessage(formattedError))
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!currentUser) return // Ждем загрузки текущего пользователя
    if (id && currentUser !== null) loadModel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Функция для фильтрации символов - разрешает только латиницу, кириллицу, цифры, пробелы и основные знаки препинания
  const filterAllowedCharacters = (text) => {
    const allowedPattern = /[a-zA-Zа-яА-ЯёЁ0-9\s.,\-_():;]/g
    const matches = text.match(allowedPattern)
    return matches ? matches.join('') : ''
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Применяем фильтрацию только для полей "title" и "description"
    if (name === 'title' || name === 'description') {
      const filteredValue = filterAllowedCharacters(value)
      setValue(name, filteredValue, { shouldValidate: true })
    } else {
      setValue(name, value, { shouldValidate: true })
    }
  }

  // Обработчик для предотвращения ввода недопустимых символов с клавиатуры
  const handleKeyDown = (e) => {
    const { name } = e.target
    if (name === 'title' || name === 'description') {
      const allowedKeys = [
        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End', 'Tab', 'Enter', 'Escape'
      ]
      
      if (e.ctrlKey || e.metaKey || allowedKeys.includes(e.key)) {
        return
      }
      
      const char = e.key
      if (char && char.length === 1 && !/[a-zA-Zа-яА-ЯёЁ0-9\s.,\-_():;]/.test(char)) {
        e.preventDefault()
      }
    }
  }

  // Обработчик для предотвращения вставки недопустимых символов
  const handlePaste = (e) => {
    const { name, selectionStart, selectionEnd, value } = e.target
    if (name === 'title' || name === 'description') {
      e.preventDefault()
      const pastedText = (e.clipboardData || window.clipboardData).getData('text')
      const filteredText = filterAllowedCharacters(pastedText)
      let newValue = value.substring(0, selectionStart) + filteredText + value.substring(selectionEnd)
      
      // Ограничение длины для description (1000 символов)
      if (name === 'description' && newValue.length > 1000) {
        newValue = newValue.substring(0, 1000)
      }
      
      setValue(name, newValue, { shouldValidate: true })
      
      setTimeout(() => {
        const input = e.target
        const newCursorPos = Math.min(selectionStart + filteredText.length, newValue.length)
        input.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }

  const toggleProject = (projectId) => {
    const currentIds = formData.projectIds || []
    const newIds = currentIds.includes(projectId)
      ? currentIds.filter(id => id !== projectId)
      : [...currentIds, projectId]
    
    setSelectedProjects(newIds)
    setValue('projectIds', newIds, { shouldValidate: false })
  }

  const toggleSphere = (sphereId) => {
    const currentIds = formData.sphereIds || []
    const newIds = currentIds.includes(sphereId)
      ? currentIds.filter(id => id !== sphereId)
      : [...currentIds, sphereId]
    
    setSelectedSpheres(newIds)
    setValue('sphereIds', newIds, { shouldValidate: false })
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

  const handleScreenshotAdd = (files) => {
    // files - массив File объектов, нужно создать объекты с preview
    const newScreenshots = files.map(file => ({
      preview: URL.createObjectURL(file),
      file: file
    }))
    setScreenshots(prev => [...prev, ...newScreenshots])
  }

  // Обработчик для прямого использования в onChange
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const validFiles = []
      const invalidFiles = []
      const oversizedFiles = []
      const MAX_FILE_SIZE = 700 * 1024 // 700 кБ в байтах
      
      files.forEach(file => {
        if (!isValidImageFile(file)) {
          invalidFiles.push(file.name)
        } else if (file.size > MAX_FILE_SIZE) {
          oversizedFiles.push(file.name)
        } else {
          validFiles.push(file)
        }
      })
      
      if (invalidFiles.length > 0) {
        showError(`Следующие файлы не являются изображениями и не будут добавлены: ${invalidFiles.join(', ')}. Разрешены только изображения: JPG, PNG, GIF, WEBP, BMP`)
      }
      
      if (oversizedFiles.length > 0) {
        showError(`Следующие файлы превышают максимальный размер 700 кБ и не будут добавлены: ${oversizedFiles.join(', ')}`)
      }
      
      if (validFiles.length > 0) {
        handleScreenshotAdd(validFiles)
      }
      
      e.target.value = '' // Сбрасываем input для возможности повторной загрузки того же файла
    }
  }

  const removeScreenshot = (index) => {
    setScreenshots(prev => {
      const newScreenshots = [...prev]
      if (newScreenshots[index]?.preview && newScreenshots[index].preview.startsWith('blob:')) {
        URL.revokeObjectURL(newScreenshots[index].preview)
      }
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
    
    // Проверяем, редактируются ли скриншоты: есть новые, удаленные или изменен порядок
    const hasScreenshotChanges = screenshots.length > 0 || deletedScreenshots.length > 0
    
    // Если скриншоты не редактируются, валидация не нужна
    if (!hasScreenshotChanges) {
      return true
    }
    
    // Проверяем количество скриншотов только если они редактируются
    const remainingCurrentScreenshots = currentFiles.screenshots.filter(
      screenshot => {
        const url = typeof screenshot === 'string' ? screenshot : (screenshot?.originalUrl || screenshot)
        return !deletedScreenshots.includes(url)
      }
    )
    const newScreenshotsCount = screenshots.length
    const totalScreenshots = remainingCurrentScreenshots.length + newScreenshotsCount
    
    return totalScreenshots >= 2 && totalScreenshots <= 8
  }

  const onSubmitForm = async (data) => {
    console.log('onSubmitForm called with data:', data)
    console.log('canEditModel:', canEditModel, 'canEditDescription:', canEditDescription, 'canEditSphere:', canEditSphere, 'canEditScreenshots:', canEditScreenshots)
    setIsLoading(true)
    setError(null)

    try {
      // Проверка уникальности названия перед отправкой (только если редактируется название)
      if (canEditModel && data.title) {
        const title = data.title.trim()
        const originalTitle = existingModel?.title?.trim()
        
        // Проверяем только если название изменилось
        if (title !== originalTitle) {
          if (titleExists || isCheckingTitle) {
            if (isCheckingTitle) {
              showError('Пожалуйста, дождитесь завершения проверки названия')
            } else {
              showError('Модель с таким названием уже существует')
            }
            setIsLoading(false)
            return
          }
        }
      }

      // Проверка количества скриншотов перед сохранением (только если редактируются скриншоты)
      // Проверяем только если есть изменения в скриншотах (новые или удаленные)
      const hasScreenshotChanges = screenshots.length > 0 || deletedScreenshots.length > 0
      if ((canEditModel || canEditScreenshots) && hasScreenshotChanges && !isValidScreenshotsCount()) {
        const remainingCurrentScreenshots = currentFiles.screenshots.filter(
          screenshot => {
            const url = typeof screenshot === 'string' ? screenshot : (screenshot?.originalUrl || screenshot)
            return !deletedScreenshots.includes(url)
          }
        )
        const newScreenshotsCount = screenshots.length
        const totalScreenshots = remainingCurrentScreenshots.length + newScreenshotsCount
        
        let errorMessage = ''
        if (totalScreenshots < 2) {
          errorMessage = 'Добавьте минимум 2 скриншота'
        } else if (totalScreenshots > 8) {
          errorMessage = 'Максимальное количество скриншотов: 8'
        }
        
        if (errorMessage) {
          showError(errorMessage)
        }
        setIsLoading(false)
        return
      }

      const formDataToSend = new FormData()
      formDataToSend.append('id', id)
      
      // Если можно редактировать только описание, сферу или скриншоты (но не полную модель), отправляем соответствующие поля
      if (!canEditModel && (canEditDescription || canEditSphere || canEditScreenshots)) {
        if (canEditDescription) {
          formDataToSend.append('description', data.description || '')
        }
        if (canEditSphere) {
          const sphereIds = data.sphereIds || selectedSpheres
          sphereIds.forEach(id => formDataToSend.append('sphereIds', id))
        }
        if (canEditScreenshots) {
          // Добавляем информацию об удаленных скриншотах
          deletedScreenshots.forEach(url => {
            formDataToSend.append('deletedScreenshots', url)
          })
          // Отправляем порядок существующих скриншотов (после удаления удаленных)
          currentFiles.screenshots
            .map(screenshot => typeof screenshot === 'string' ? screenshot : (screenshot?.originalUrl || screenshot))
            .filter(url => url && !deletedScreenshots.includes(url))
            .forEach(url => {
              formDataToSend.append('currentScreenshotUrls', url)
            })
          // Добавляем новые скриншоты
          screenshots.forEach(screenshot => {
            if (screenshot && screenshot.file) {
              formDataToSend.append('screenshots', screenshot.file)
            }
          })
        }
      } else {
        // Добавляем все поля формы
        if (data.title) formDataToSend.append('title', data.title)
        if (data.description !== undefined) formDataToSend.append('description', data.description || '')
        if (data.authorId) formDataToSend.append('authorId', data.authorId)
        if (data.version) formDataToSend.append('version', data.version)
        
        // Добавляем выбранные проекты
        const projectIds = data.projectIds || selectedProjects
        projectIds.forEach(projectId => {
          formDataToSend.append('projectIds', projectId)
        })

        // Добавляем выбранные сферы
        const sphereIds = data.sphereIds || selectedSpheres
        sphereIds.forEach(id => formDataToSend.append('sphereIds', id))
        
        // Добавляем информацию об удаленных скриншотах
        deletedScreenshots.forEach(url => {
          formDataToSend.append('deletedScreenshots', url)
        })
        
        // Отправляем порядок существующих скриншотов (после удаления удаленных)
        currentFiles.screenshots
          .filter(url => !deletedScreenshots.includes(url))
          .forEach(url => {
            formDataToSend.append('currentScreenshotUrls', url)
          })
        
        // Добавляем информацию об удалении ZIP-файла, если он был удален
        if (!currentFiles.zip && !zipFile && existingModel?.fileUrl) {
          formDataToSend.append('deleteZipFile', 'true')
        }
        
        // Добавляем новые файлы, если они были выбраны
        if (zipFile) formDataToSend.append('zipFile', zipFile)
        screenshots.forEach(screenshot => {
          if (screenshot && screenshot.file) {
            formDataToSend.append('screenshots', screenshot.file)
          }
        })
      }

      const result = await apiClient.models.update(id, formDataToSend)

      if (result && result.success) {
        success('Модель успешно обновлена')
        
        // Перенаправляем на страницу карточки модели
        router.push(`/dashboard/models/${id}`)
      } else {
        throw new Error(result?.error || 'Не удалось обновить модель')
      }
    } catch (err) {
      const formattedError = await handleError(err, { context: 'ModelEditForm.onSubmitForm', modelId: id })
      const errorMessage = getErrorMessage(formattedError)
      setError(errorMessage)
      showError(errorMessage)
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
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 cursor-pointer"
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
        {/* Кнопка назад и название модели */}
        <div className="mb-6 relative">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute -left-12 top-0 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Назад"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          {canEditModel ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название модели <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('title')}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 ${
                    errors.title || titleExists ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Введите название модели"
                  maxLength={50}
                />
                {isCheckingTitle && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              {(errors.title || titleExists) && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.title?.message || 'Модель с таким названием уже существует'}
                </p>
              )}
            </div>
          ) : (
            <h1 className="text-2xl font-semibold text-gray-900 leading-none pb-0">
              {formData.title || 'Редактирование модели'}
            </h1>
          )}
        </div>
      
      <form id="model-edit-form" onSubmit={handleFormSubmit(onSubmitForm, (errors) => {
        console.error('Form validation errors:', errors)
        if (Object.keys(errors).length > 0) {
          const firstError = Object.values(errors)[0]
          const errorMessage = firstError?.message || 'Пожалуйста, исправьте ошибки в форме'
          showError(errorMessage)
        }
      })} className="space-y-8">
        {errors.root && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{errors.root.message}</p>
          </div>
        )}
        {Object.keys(errors).length > 0 && errors.root === undefined && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-600">Пожалуйста, исправьте ошибки в форме</p>
            {Object.entries(errors).map(([key, error]) => (
              error?.message && (
                <p key={key} className="text-sm text-yellow-600 mt-1">
                  {key}: {error.message}
                </p>
              )
            ))}
          </div>
        )}
        {canEditModel === true ? (
          <>
            {/* Галерея скриншотов */}
            <ScreenshotsSection
              currentScreenshots={currentFiles.screenshots}
              newScreenshots={screenshots}
              deletedScreenshots={deletedScreenshots}
              onRemoveCurrent={removeCurrentScreenshot}
              onRemoveNew={removeScreenshot}
              onAdd={handleScreenshotAdd}
              onRestoreDeleted={restoreDeletedScreenshot}
              draggedIndex={draggedIndex}
              dragOverIndex={dragOverIndex}
              draggedType={draggedType}
              onCurrentDragStart={handleCurrentDragStart}
              onCurrentDragOver={handleCurrentDragOver}
              onCurrentDragLeave={handleCurrentDragLeave}
              onCurrentDrop={handleCurrentDrop}
              onNewDragStart={handleNewDragStart}
              onNewDragOver={handleNewDragOver}
              onNewDragLeave={handleNewDragLeave}
              onNewDrop={handleNewDrop}
              canEditModel={canEditModel}
              canEditScreenshots={canEditScreenshots}
              disabled={isLoading || isSubmitting}
            />
            
            {/* Информация о модели */}
            <ModelInfoSection
              form={formData}
              handleChange={handleChange}
              users={users}
              currentUser={currentUser}
              canEditModel={canEditModel}
              canEditDescription={canEditDescription}
              showTitle={false}
              existingModel={existingModel}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
            />

            {/* Сферы */}
            <SpheresSection
              spheres={spheres}
              selectedSpheres={selectedSpheres}
              onToggleSphere={toggleSphere}
              searchTerm={sphereSearchTerm}
              onSearchChange={setSphereSearchTerm}
              disabled={isLoading || isSubmitting}
            />

            {/* ZIP-архив модели */}
            <FileUploadSection
              currentFile={currentFiles.zip}
              newFile={zipFile}
              onFileChange={(file) => {
                setZipFile(file)
                if (currentFiles.zip) {
                  setCurrentFiles(prev => ({ ...prev, zip: null }))
                }
              }}
              disabled={!canEditModel || isLoading || isSubmitting}
              label="ZIP-архив модели"
            />

            {/* Проекты */}
            <ProjectsSection
              projects={projects}
              selectedProjects={selectedProjects}
              onToggleProject={toggleProject}
              searchTerm={projectSearchTerm}
              onSearchChange={setProjectSearchTerm}
              disabled={isLoading || isSubmitting}
            />
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
                  {...register('description')}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  rows={4}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  maxLength={5000}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>
            )}
            
            {/* Сферы */}
            {canEditSphere && (
              <SpheresSection
                spheres={spheres}
                selectedSpheres={selectedSpheres}
                onToggleSphere={toggleSphere}
                searchTerm={sphereSearchTerm}
                onSearchChange={setSphereSearchTerm}
                disabled={isLoading || isSubmitting}
              />
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
                    {currentFiles.screenshots.map((file, index) => {
                      const fileUrl = typeof file === 'string' ? file : (file?.originalUrl || file)
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
                          src={proxyUrl(fileUrl)}
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
                          className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors z-10 cursor-pointer"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs font-medium rounded">
                          {index + 1} / {currentFiles.screenshots.length}
                        </div>
                      </div>
                      )
                    })}
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
                        onChange={handleFileInputChange}
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
                        {screenshots.map((screenshot, index) => (
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
                              src={screenshot.preview || URL.createObjectURL(screenshot.file)}
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
                              className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors z-10 cursor-pointer"
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
      
      {/* Кнопки действий */}
      {(canEditModel === true || canEditDescription === true || canEditSphere === true || canEditScreenshots === true) && (
        <div className="sticky bottom-6 mt-8 flex flex-col items-end gap-4 z-10">
          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isLoading || isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
              <button
                type="submit"
                form="model-edit-form"
                disabled={isLoading || isSubmitting}
                className={`inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  (isLoading || isSubmitting) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {(isLoading || isSubmitting) ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Сохранение...
                  </>
                ) : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      
    </div>
  )
}
