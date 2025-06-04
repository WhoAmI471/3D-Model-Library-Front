'use client'
import { useState, useEffect } from 'react'

export default function ModelUploadForm() {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProjects, setSelectedProjects] = useState([])
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    projectId: '',
    authorId: '',
    sphere: '',
    zipFile: null,
    screenshots: []
  })

  const toggleProject = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, projectsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/projects')
        ])
        
        const usersData = await usersRes.json()
        const projectsData = await projectsRes.json()
        
        setUsers(Array.isArray(usersData) ? usersData : [])
        setProjects(Array.isArray(projectsData) ? projectsData : [])
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
        setUsers([])
        setProjects([])
      }
    }
    
    fetchData()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormState(prev => ({ ...prev, [name]: value }))
  }

  const handleZipFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormState(prev => ({ ...prev, zipFile: file }))
    }
  }

  const handleScreenshotAdd = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setFormState(prev => ({
        ...prev,
        screenshots: [...prev.screenshots, ...files.map(file => ({
          file,
          preview: URL.createObjectURL(file)
        }))]
      }))
    }
  }

  const removeScreenshot = (index) => {
    setFormState(prev => {
      const newScreenshots = [...prev.screenshots]
      URL.revokeObjectURL(newScreenshots[index].preview)
      newScreenshots.splice(index, 1)
      return { ...prev, screenshots: newScreenshots }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (!formState.title || !formState.sphere || !formState.zipFile || formState.screenshots.length < 2) {
      alert('Пожалуйста, заполните все обязательные поля и добавьте минимум 2 скриншота')
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('title', formState.title)
    formData.append('description', formState.description)
    selectedProjects.forEach(projectId => {
      formData.append('projectIds', projectId)
    })
    formData.append('authorId', formState.authorId)
    formData.append('sphere', formState.sphere)
    formData.append('zipFile', formState.zipFile)

    formState.screenshots.forEach(screenshot => {
      formData.append('screenshots', screenshot.file)
    })
    
    try {
      const res = await fetch('/api/models/upload', {
        method: 'POST',
        body: formData,
      })

      const text = await res.text()
      const result = text ? JSON.parse(text) : {}

      if (res.ok && result.success) {
        alert('Модель загружена успешно!')
        // Сброс формы после успешной загрузки
        setFormState({
          title: '',
          description: '',
          projectId: '',
          authorId: '',
          sphere: '',
          zipFile: null,
          screenshots: []
        })
        setSelectedProjects([])
      } else {
        console.error(result)
        alert(result.error || 'Ошибка при загрузке модели')
      }
    } catch (err) {
      console.error('Ошибка сети или сервера:', err)
      alert('Ошибка загрузки. Попробуйте позже.')
    }

    setLoading(false)
  }

  // Форматирование размера файла
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full mx-auto">
      <h1 className="text-2xl font-bold mb-6">Добавление новой модели</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Название модели */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название модели <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              placeholder="Введите название модели"
              value={formState.title}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              maxLength={50}
              required
            />
          </div>

          {/* Скриншоты */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Скриншоты <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">(минимум 2)</span>
            </label>
            
            {/* Добавление новых скриншотов */}
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
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {formState.screenshots.map((screenshot, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-md overflow-hidden">
                    <img
                      src={screenshot.preview}
                      alt={`Скриншот ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 truncate">
                    {screenshot.file.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {formatFileSize(screenshot.file.size)}
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
          </div>

          {/* ZIP-архив модели */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP-архив модели <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex items-center">
              <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Выберите файл
                <input
                  name="zipFile"
                  type="file"
                  onChange={handleZipFileChange}
                  accept=".zip"
                  className="sr-only"
                  required
                />
              </label>
              {formState.zipFile && (
                <div className="ml-4 text-sm text-gray-700">
                  <p>{formState.zipFile.name}</p>
                  <p className="text-gray-500">{formatFileSize(formState.zipFile.size)}</p>
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
              placeholder="Добавьте описание модели"
              value={formState.description}
              onChange={handleChange}
              rows={4}
              maxLength={1000}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Автор */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Автор
            </label>
            <select
              name="authorId"
              value={formState.authorId}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Выберите автора</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Сфера */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сфера <span className="text-red-500">*</span>
            </label>
            <select
              name="sphere"
              value={formState.sphere}
              onChange={handleChange}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Проекты
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto p-3 border border-gray-300 rounded-md">
              {projects.map(project => (
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


        {/* Кнопка отправки */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Загрузка...
              </>
            ) : 'Сохранить модель'}
          </button>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Заполните все обязательные поля (отмечены *) для сохранения модели
          </p>
        </div>
      </form>
    </div>
  )
}