'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatFileSize, proxyUrl } from '@/lib/utils'
import { checkPermission } from '@/lib/permission'

export default function ModelEditForm({ id, userRole }) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    description: '',
    authorId: '',
    version: '',
    sphere: '',
  })
  const [selectedProjects, setSelectedProjects] = useState([])
  const [zipFile, setZipFile] = useState(null)
  const [screenshots, setScreenshots] = useState([])
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
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

  useEffect(() => {
    
    setCanEditModel(checkPermission(userRole, 'edit_models'))
    setCanEditDescription(checkPermission(userRole, 'edit_model_description'))
    console.log(userRole);
  }, [userRole])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, projectsRes, currentUserRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/projects'),
          fetch('/api/auth/me')
        ])

        const usersData = await usersRes.json()
        const projectsData = await projectsRes.json()
        const currentUserData = await currentUserRes.json()
        
        setUsers(Array.isArray(usersData) ? usersData : [])
        setProjects(Array.isArray(projectsData) ? projectsData : [])
        setCurrentUser(currentUserData?.user || null)
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
          sphere: data.sphere || '',
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

  const handleScreenshotAdd = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setScreenshots(prev => [...prev, ...files])
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
      const deleted = newScreenshots.splice(index, 1)
      // Получаем оригинальный URL для удаления
      const originalUrl = typeof deleted[0] === 'string' ? deleted[0] : deleted[0].originalUrl || deleted[0]
      setDeletedScreenshots(prevDeleted => [...prevDeleted, originalUrl])
      return { ...prev, screenshots: newScreenshots }
    })
  }



  const handleSubmit = async (e) => {
  e.preventDefault()
  setIsLoading(true)
  setError(null)

  try {
    const formData = new FormData()
    
    // Добавляем все поля формы
    for (const key in form) {
      formData.append(key, form[key])
    }
    
    // Добавляем выбранные проекты
    selectedProjects.forEach(projectId => {
      formData.append('projectIds', projectId)
    })
    
    formData.append('id', id)
    
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

    const response = await fetch('/api/models/update', {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (response.ok && result.success) {
      router.push(`/dashboard/models/${id}`)
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
            className={`block w-full px-3 py-2 border ${canEditModel ? 'border-gray-300' : 'border-gray-100 bg-gray-50'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            required
            maxLength={50}
            disabled={canEditDescription}
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
                    className={`absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 ${canEditDescription ? 'group-hover:opacity-0' : 'group-hover:opacity-100'} transition-opacity`}
                    disabled={canEditDescription}
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
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
                  disabled={canEditDescription}
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
                    disabled={canEditDescription}
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
                  disabled={canEditDescription}
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
              name="sphere"
              value={form.sphere}
              onChange={handleChange}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={canEditDescription}
            >
              <option value="">Выберите сферу</option>
              <option value="CONSTRUCTION">Строительство</option>
              <option value="CHEMISTRY">Химия</option>
              <option value="INDUSTRIAL">Промышленность</option>
              <option value="MEDICAL">Медицина</option>
              <option value="OTHER">Другое</option>
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

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
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
        </div>
      </form>
    </div>
  )
}
