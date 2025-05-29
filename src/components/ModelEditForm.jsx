'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function ModelEditForm({ id }) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    description: '',
    authorId: '',
    sphere: '',
    zip: ''
  })
  const [selectedProjects, setSelectedProjects] = useState([])
  const [zipFile, setZipFile] = useState(null)
  const [screenshots, setScreenshots] = useState([])
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentFiles, setCurrentFiles] = useState({
    zip: null,
    screenshots: []
  })

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

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/models/${id}?include=projects`)
        if (!res.ok) throw new Error('Не удалось загрузить модель')
        const data = await res.json()
        
        setForm({
          title: data.title || '',
          description: data.description || '',
          authorId: data.authorId || '',
          sphere: data.sphere || '',
          zip: data.fileUrl || ''
        })
        
        setSelectedProjects(data.projects?.map(p => p.id) || [])
        
        setCurrentFiles({
          zip: data.fileUrl,
          screenshots: data.images || []
        })
        
      } catch (err) {
        console.error('Ошибка загрузки модели:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) loadModel()
  }, [id])

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
      
      // Добавляем новые файлы, если они были выбраны
      if (zipFile) formData.append('zipFile', zipFile)
      screenshots.forEach(screenshot => formData.append('screenshots', screenshot))

      const response = await axios.post('/api/models/update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        router.push('/dashboard')
      } else {
        throw new Error(response.data.error || 'Не удалось обновить модель')
      }
    } catch (err) {
      console.error('Ошибка обновления:', err)
      setError(err.response?.data?.error || err.message || 'Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !error) {
    return <div className="text-center py-8">Загрузка данных модели...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Ошибка: {error}
        <button 
          onClick={() => window.location.reload()} 
          className="ml-4 bg-gray-200 px-4 py-2 rounded"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
      <div>
        <label className="block mb-1 font-medium">Название модели</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          placeholder="Введите название"
          required
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Описание</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          className="w-full p-2 border rounded min-h-[120px]"
          placeholder="Добавьте описание модели"
        />
      </div>
        
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium">Автор</label>
          <select
            name="authorId"
            value={form.authorId}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="">Выберите автора</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">Сфера применения</label>
          <select
            name="sphere"
            value={form.sphere}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Выберите сферу</option>
            <option value="CONSTRUCTION">Строительство</option>
            <option value="CHEMISTRY">Химия</option>
            <option value="INDUSTRIAL">Промышленность</option>
            <option value="MEDICAL">Медицина</option>
            <option value="OTHER">Другое</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block mb-1 font-medium">Проекты</label>
        <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded">
          {projects.map(project => (
            <div key={project.id} className="flex items-center">
              <input
                type="checkbox"
                id={`project-${project.id}`}
                checked={selectedProjects.includes(project.id)}
                onChange={() => toggleProject(project.id)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor={`project-${project.id}`} className="ml-2">
                {project.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block mb-1 font-medium">ZIP-архив модели</label>
        <input
          type="file"
          accept=".zip"
          onChange={(e) => setZipFile(e.target.files[0])}
          className="w-full p-2 border rounded"
        />
        {currentFiles.zip && (
          <p className="text-sm text-gray-500 mt-1">
            Текущий файл: {currentFiles.zip.split('/').pop()}
          </p>
        )}
      </div>

      <div>
        <label className="block mb-1 font-medium">Скриншоты</label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setScreenshots(Array.from(e.target.files))}
          className="w-full p-2 border rounded"
        />
        {currentFiles.screenshots.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium">Текущие скриншоты:</p>
            <ul className="text-sm text-gray-500">
              {currentFiles.screenshots.map((file, index) => (
                <li key={index}>{file.split('/').pop()}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
          disabled={isLoading}
        >
          Отмена
        </button>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
          disabled={isLoading}
        >
          {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>
    </form>
  )
}