'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatFileSize, proxyUrl } from '@/lib/utils'
import { checkPermission } from '@/lib/permission'
import { ALL_PERMISSIONS } from '@/lib/roles'

export default function ModelEditForm({ id, userRole }) {
  const router = useRouter()
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
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [spheres, setSpheres] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentFiles, setCurrentFiles] = useState({
    zip: null,
    screenshots: []
  })
  const [deletedScreenshots, setDeletedScreenshots] = useState([])
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  const [existingModel, setExistingModel] = useState(null)

  
  const [canEditModel, setCanEditModel] = useState(null);
  const [canEditDescription, setCanEditDescription] = useState(null);
  const [canEditSphere, setCanEditSphere] = useState(null);
  const [canEditScreenshots, setCanEditScreenshots] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, projectsRes, spheresRes, currentUserRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/projects'),
          fetch('/api/spheres'),
          fetch('/api/auth/me')
        ])

        const usersData = await usersRes.json()
        const projectsData = await projectsRes.json()
        const spheresData = await spheresRes.json()
        const currentUserData = await currentUserRes.json()
        
        setUsers(Array.isArray(usersData) ? usersData : [])
        setProjects(Array.isArray(projectsData) ? projectsData : [])
        setSpheres(Array.isArray(spheresData) ? spheresData : [])
        const user = currentUserData?.user || null
        setCurrentUser(user)
        
        // Устанавливаем права доступа на основе объекта пользователя
        if (user) {
          setCanEditModel(checkPermission(user, ALL_PERMISSIONS.EDIT_MODELS))
          setCanEditDescription(checkPermission(user, ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION))
          setCanEditSphere(checkPermission(user, ALL_PERMISSIONS.EDIT_MODEL_SPHERE))
          setCanEditScreenshots(checkPermission(user, ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS))
        } else {
          setCanEditModel(false)
          setCanEditDescription(false)
          setCanEditSphere(false)
          setCanEditScreenshots(false)
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
        setUsers([])
        setProjects([])
        setCurrentUser(null)
      }
    }
    
    fetchData()
  }, [])

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/models/${id}?include=projects`)
        if (!res.ok) throw new Error('Не удалось загрузить модель')
        const data = await res.json()
        
        // Обрабатываем authorId: если null, используем 'UNKNOWN'
        // Если authorId есть и это текущий пользователь - используем его ID
        // Если authorId есть, но это не текущий пользователь - используем 'EXTERNAL'
        let authorIdValue = 'UNKNOWN'
        if (data.authorId) {
          if (currentUser && data.authorId === currentUser.id) {
            authorIdValue = currentUser.id
          } else {
            authorIdValue = 'EXTERNAL'
          }
        }
        
        setForm({
          title: data.title || '',
          description: data.description || '',
          authorId: authorIdValue,
          version: '',
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
      // Используем полную перезагрузку страницы с timestamp для гарантированного обновления данных
      window.location.href = `/dashboard/models/${id}?t=${Date.now()}`
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
    <div className="w-full mx-auto">
      <h1 className="text-2xl font-bold mb-6">Редактирование модели</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {canEditModel === true ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Название модели */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название модели <span className="text-red-500">*</span>
              </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
              maxLength={50}
            />
          </div>

          {/* Версия */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Версия
            </label>
            <input
              name="version"
              value={form.version}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              maxLength={20}
            />
          </div>

            {/* Текущие скриншоты */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Текущие скриншоты
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {currentFiles.screenshots.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-md overflow-hidden">
                    <img
                      src={proxyUrl(file)}
                      alt={`Скриншот ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 truncate">
                    {file.split('/').pop()}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCurrentScreenshot(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={!canEditModel && !canEditScreenshots}
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
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
                        className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Восстановить скриншот"
                      >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
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
                  disabled={!canEditModel && !canEditScreenshots}
                />
              </label>
            </div>

            {/* Галерея добавленных скриншотов */}
            {screenshots.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {screenshots.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-md overflow-hidden">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Новый скриншот ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-500 truncate">
                      {file.name}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {formatFileSize(file.size)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeScreenshot(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ZIP-архив модели */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP-архив модели
            </label>
            {currentFiles.zip && (
              <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Текущий файл: {currentFiles.zip.split('/').pop()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {currentFiles.zip}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentFiles(prev => ({ ...prev, zip: null }))
                      setZipFile(null)
                    }}
                    className="ml-4 text-red-600 hover:text-red-800 text-sm"
                    disabled={true}
                    title="Удалить файл"
                  >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            <div className="mt-1">
              <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {currentFiles.zip ? 'Заменить ZIP-файл' : 'Выберите ZIP-файл'}
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      // Проверка расширения файла
                      const fileName = file.name.toLowerCase()
                      if (!fileName.endsWith('.zip')) {
                        alert('Можно загружать только .zip файлы!')
                        e.target.value = ''
                        return
                      }
                      setZipFile(file)
                      // Если был текущий файл, он будет заменен
                      if (currentFiles.zip) {
                        setCurrentFiles(prev => ({ ...prev, zip: null }))
                      }
                    }
                  }}
                  className="sr-only"
                  disabled={true}
                />
              </label>
              {zipFile && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    Новый файл: {zipFile.name} ({formatFileSize(zipFile.size)})
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Описание */}
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

          {/* Автор */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Автор
            </label>
            <select
              name="authorId"
              value={form.authorId || (currentUser ? currentUser.id : 'UNKNOWN')}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              required
              disabled
            >
              {/* Текущий пользователь (Я) */}
              {currentUser && (
                <option value={currentUser.id}>
                  {currentUser.name} (Я)
                </option>
              )}
              {/* Неизвестно */}
              <option value="UNKNOWN">Неизвестно</option>
              {/* Сторонняя модель */}
              <option value="EXTERNAL">Сторонняя модель</option>
            </select>
          </div>

          {/* Сфера */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сфера <span className="text-red-500">*</span>
            </label>
            <select
              name="sphereId"
              value={form.sphereId}
              onChange={handleChange}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={!canEditSphere}
            >
              <option value="">Выберите сферу</option>
              {spheres.map((sphere) => (
                <option key={sphere.id} value={sphere.id}>
                  {sphere.name}
                </option>
              ))}
            </select>
          </div>

          {/* Проекты */}
          
          <div className='w-full'>
            <h3 className="block text-sm font-medium text-gray-700 mb-1">Поиск проектов</h3>
            <div className="mt-2 relative">
              <input
                type="text"
                placeholder="Поиск проектов..."
                className=" w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={projectSearchTerm}
                onChange={(e) => setProjectSearchTerm(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Проекты
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto p-3 border border-gray-300 rounded-md">
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
                    {project.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
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
                  value={form.sphereId}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Выберите сферу</option>
                  {spheres.map((sphere) => (
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {currentFiles.screenshots.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-md overflow-hidden">
                          <img
                            src={proxyUrl(file)}
                            alt={`Скриншот ${index + 1}`}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="mt-1 text-xs text-gray-500 truncate">
                          {file.split('/').pop()}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCurrentScreenshot(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
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
                              className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Восстановить скриншот"
                            >
                              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
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
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {screenshots.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-md overflow-hidden">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Новый скриншот ${index + 1}`}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className="mt-1 text-xs text-gray-500 truncate">
                            {file.name}
                          </div>
                          <div className="mt-1 text-xs text-gray-400">
                            {formatFileSize(file.size)}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeScreenshot(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
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

        {/* Кнопки действий */}
        {(canEditModel === true || canEditDescription === true || canEditSphere === true || canEditScreenshots === true) && (
        <div className="pt-4">
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Отмена
            </button>
            <div className="flex flex-col items-end">
              <button
                type="submit"
                disabled={isLoading || !isValidScreenshotsCount()}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  (isLoading || !isValidScreenshotsCount()) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Сохранение...
                  </>
                ) : 'Сохранить изменения'}
              </button>
              {!isValidScreenshotsCount() && (canEditModel || canEditScreenshots) && (
                <p className="mt-1 text-xs text-red-600 text-right">
                  Скриншотов должно быть минимум 2. Загрузите еще или восстановите удаленные.
                </p>
              )}
            </div>
          </div>
        </div>
        )}
      </form>
    </div>
  )
}
