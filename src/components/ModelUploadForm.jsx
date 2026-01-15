'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useModelsData } from '@/hooks/useModelsData'
import { useDragAndDrop } from '@/hooks/useDragAndDrop'
import { useNotification } from '@/hooks/useNotification'
import { useDebounce } from '@/hooks/useDebounce'
import apiClient from '@/lib/apiClient'
import ScreenshotsUploadSection from '@/components/modelForm/ScreenshotsUploadSection'
import ModelInfoSection from '@/components/modelForm/ModelInfoSection'
import ProjectsSection from '@/components/modelForm/ProjectsSection'
import SpheresSection from '@/components/modelForm/SpheresSection'
import FileUploadSection from '@/components/modelForm/FileUploadSection'
import { createModelSchema } from '@/lib/validations/modelSchema'

export default function ModelUploadForm({ initialProjectId = null, initialSphereId = null }) {
  const router = useRouter()
  const zipFileInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadComplete, setUploadComplete] = useState(false)
  const { users, projects, spheres, models: allModels, currentUser } = useModelsData({ includeUsers: true, includeProjects: true })
  const { success, error: showError } = useNotification()
  const [selectedProjects, setSelectedProjects] = useState([])
  const [selectedSpheres, setSelectedSpheres] = useState([])
  const [zipFile, setZipFile] = useState(null)
  const [screenshots, setScreenshots] = useState([])
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  const [sphereSearchTerm, setSphereSearchTerm] = useState('')
  const [isCheckingTitle, setIsCheckingTitle] = useState(false)
  const [titleExists, setTitleExists] = useState(false)
  
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
    setError,
    clearErrors
  } = useForm({
    resolver: zodResolver(createModelSchema),
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

  // Проверка уникальности названия модели
  useEffect(() => {
    const checkTitleUniqueness = async () => {
      const title = debouncedTitle?.trim()
      
      // Очищаем ошибку, если поле пустое
      if (!title || title.length === 0) {
        setTitleExists(false)
        clearErrors('title')
        setIsCheckingTitle(false)
        return
      }

      // Не проверяем, если название слишком короткое (меньше минимальной длины)
      if (title.length < 1) {
        setTitleExists(false)
        setIsCheckingTitle(false)
        return
      }

      setIsCheckingTitle(true)
      try {
        const result = await apiClient.models.checkTitle(title)
        if (result.exists) {
          setTitleExists(true)
          setError('title', {
            type: 'manual',
            message: 'Модель с таким названием уже существует'
          })
        } else {
          setTitleExists(false)
          clearErrors('title')
        }
      } catch (error) {
        console.error('Ошибка проверки названия модели:', error)
        // При ошибке не блокируем ввод
        setTitleExists(false)
      } finally {
        setIsCheckingTitle(false)
      }
    }

    checkTitleUniqueness()
  }, [debouncedTitle, setError, clearErrors])

  // Устанавливаем текущего пользователя по умолчанию, если автор еще не выбран
  useEffect(() => {
    if (currentUser && !formData.authorId) {
      setValue('authorId', currentUser.id)
    }
  }, [currentUser, formData.authorId, setValue])
  
  // Автоматически выбираем проект, если передан initialProjectId
  useEffect(() => {
    if (initialProjectId && projects.length > 0) {
      setSelectedProjects([initialProjectId])
      setValue('projectIds', [initialProjectId])
    }
  }, [initialProjectId, projects, setValue])

  // Автоматически выбираем сферу, если передан initialSphereId
  useEffect(() => {
    if (initialSphereId && spheres.length > 0) {
      setSelectedSpheres([initialSphereId])
      setValue('sphereIds', [initialSphereId])
    }
  }, [initialSphereId, spheres, setValue])

  // Получаем информацию о выбранном проекте для отображения города
  const selectedProject = projects.find(p => selectedProjects.includes(p.id))
  
  // Функция для фильтрации символов - разрешает только латиницу, кириллицу, цифры, пробелы и основные знаки препинания
  const filterAllowedCharacters = (text) => {
    const allowedPattern = /[a-zA-Zа-яА-ЯёЁ0-9\s.,\-_():;]/g
    const matches = text.match(allowedPattern)
    return matches ? matches.join('') : ''
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

  const handleZipFileChange = (file) => {
    // Очищаем предыдущие ошибки
    clearErrors('root')
    
    if (file) {
      const fileName = file.name.toLowerCase()
      const isZip = fileName.endsWith('.zip')
      
      if (!isZip) {
        const errorMessage = 'Можно загружать только .zip файлы!'
        setError('root', { type: 'validation', message: errorMessage })
        showError(errorMessage)
        if (zipFileInputRef.current) {
          zipFileInputRef.current.value = ''
        }
        setZipFile(null)
        return
      }
      
      setZipFile(file)
    } else {
      setZipFile(null)
    }
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

  const handleScreenshotAdd = (newScreenshots) => {
    setScreenshots(prev => [...prev, ...newScreenshots])
  }

  const removeScreenshot = (index) => {
    setScreenshots(prev => {
      const newScreenshots = [...prev]
      URL.revokeObjectURL(newScreenshots[index].preview)
      newScreenshots.splice(index, 1)
      return newScreenshots
    })
  }

  // Drag and drop для скриншотов
  const handleScreenshotsReorder = (newScreenshots) => {
    setScreenshots(newScreenshots)
  }

  const {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragAndDrop(screenshots, handleScreenshotsReorder)

  const removeZipFile = () => {
    setZipFile(null)
    if (zipFileInputRef.current) {
      zipFileInputRef.current.value = ''
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


  const onSubmitForm = async (data) => {
    // Проверка уникальности названия перед отправкой
    if (titleExists || isCheckingTitle) {
      if (isCheckingTitle) {
        showError('Пожалуйста, дождитесь завершения проверки названия')
      } else {
        showError('Модель с таким названием уже существует')
      }
      return
    }

    // Валидация файлов
    if (!zipFile) {
      setError('root', { type: 'validation', message: 'Загрузите ZIP-архив модели' })
      return
    }
    
    if (!screenshots || screenshots.length < 2) {
      setError('root', { type: 'validation', message: 'Добавьте минимум 2 скриншота' })
      return
    }
    
    if (screenshots.length > 8) {
      setError('root', { type: 'validation', message: 'Максимальное количество скриншотов: 8' })
      return
    }

    if (loading) {
      return
    }
  
    setLoading(true)
    setUploadProgress(0)
    setUploadComplete(false)

    // Уведомление о загрузке больше не показываем - используем индикатор прогресса на странице

    const xhr = new XMLHttpRequest()
    const formDataToSend = new FormData()
    
    formDataToSend.append('title', data.title)
    formDataToSend.append('description', data.description || '')
    formDataToSend.append('authorId', data.authorId || '')
    formDataToSend.append('version', data.version || '1.0')

    const projectIds = data.projectIds || selectedProjects
    projectIds.forEach(id => formDataToSend.append('projectIds', id))

    const sphereIds = data.sphereIds || selectedSpheres
    sphereIds.forEach(id => formDataToSend.append('sphereIds', id))

    formDataToSend.append('zipFile', zipFile)
    screenshots.forEach(sc => formDataToSend.append('screenshots', sc.file))

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result.success) {
            setUploadProgress(100);
            setUploadComplete(true);
            
            // Показываем уведомление об успехе
            success('Модель успешно добавлена!')
            
            // Небольшая задержка перед возвратом
            setTimeout(() => {
              // Если модель добавлялась через редактирование проекта, возвращаемся на страницу проекта
              if (initialProjectId) {
                router.push(`/dashboard/projects/${initialProjectId}`)
              } else if (initialSphereId) {
                // Если модель добавлялась через сферу, возвращаемся на страницу сферы
                router.push(`/dashboard/spheres/${initialSphereId}`)
              } else {
                router.back()
              }
            }, 1000);
          } else {
            throw new Error(result.error || 'Ошибка при сохранении модели');
          }
        } catch (err) {
          console.error('Ошибка парсинга ответа:', err);
          showError('Ошибка при сохранении модели')
          setUploadProgress(0);
          setUploadComplete(false);
        }
      } else {
        setUploadProgress(0);
        setUploadComplete(false);
        try {
          const error = JSON.parse(xhr.responseText);
          showError(error.error || 'Ошибка загрузки файлов. Попробуйте снова.')
        } catch {
          showError('Ошибка загрузки файлов. Попробуйте снова.')
        }
      }
      setLoading(false);
    });

    xhr.addEventListener('error', () => {
      setUploadProgress(0);
      setUploadComplete(false);
      setLoading(false);
      showError('Ошибка загрузки файлов. Проверьте подключение к интернету.')
    });

    xhr.addEventListener('abort', () => {
      setUploadProgress(0);
      setUploadComplete(false);
      setLoading(false);
    });

    xhr.open('POST', '/api/models/upload')
    xhr.send(formDataToSend)
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()))

  return (
    <div className="bg-white">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название модели <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                {...register('title')}
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
        </div>
      
      <form onSubmit={handleFormSubmit(onSubmitForm)} className="space-y-8">
        {errors.root && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{errors.root.message}</p>
          </div>
        )}
        {/* Галерея скриншотов */}
        <ScreenshotsUploadSection
          screenshots={screenshots}
          onAdd={handleScreenshotAdd}
          onRemove={removeScreenshot}
          draggedIndex={draggedIndex}
          dragOverIndex={dragOverIndex}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={loading}
        />

        {/* Информация о модели */}
        <ModelInfoSection
          form={formData}
          handleChange={(e) => {
            const { name, value } = e.target
            if (name === 'title' || name === 'description') {
              const filteredValue = filterAllowedCharacters(value)
              setValue(name, filteredValue, { shouldValidate: true })
            } else {
              setValue(name, value, { shouldValidate: true })
            }
          }}
          users={users}
          currentUser={currentUser}
          canEditModel={true}
          canEditDescription={true}
          showTitle={false}
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
          disabled={loading}
        />
        
        {/* Проект (если выбран) */}
        {selectedProject && (
          <div className="mb-8">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Проект</div>
              <div className="text-sm font-medium text-gray-900">
                {selectedProject.name}
                {selectedProject.city && (
                  <span className="text-gray-500 ml-2">• {selectedProject.city}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Проекты */}
        <ProjectsSection
          projects={projects}
          selectedProjects={selectedProjects}
          onToggleProject={toggleProject}
          searchTerm={projectSearchTerm}
          onSearchChange={setProjectSearchTerm}
          disabled={loading}
        />

        {/* ZIP-архив модели */}
        <FileUploadSection
          newFile={zipFile}
          onFileChange={handleZipFileChange}
          disabled={loading}
          label="ZIP-архив модели *"
          inputRef={zipFileInputRef}
        />

        {/* Кнопки действий */}
        <div className="sticky bottom-6 mt-8 flex flex-col items-end gap-4 z-10">
          {/* Индикатор прогресса загрузки */}
          {(loading || uploadProgress > 0) && (
            <div className="w-full max-w-md mt-2">
              <div className="mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {uploadComplete ? 'Готово' : `Загрузка: ${uploadProgress}%`}
                  </span>
                  {uploadComplete && (
                    <span className="text-sm text-green-600 font-semibold">✓</span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      uploadComplete ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Загрузка...
                  </>
                ) : 'Загрузить модель'}
              </button>
            </div>
          </div>
        </div>
      </form>
      </div>
    </div>
  )
}
