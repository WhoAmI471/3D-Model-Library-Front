'use client'
import { useState, useEffect } from 'react'

export default function ModelUploadForm() {
  const [models, setModels] = useState([])
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
        
        // Убедимся, что данные - массивы
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

  const handleFileChange = (e) => {
    const { name, files } = e.target
    if (name === 'screenshots') {
      setFormState(prev => ({ ...prev, screenshots: files }))
    } else if (name === 'zipFile') {
      setFormState(prev => ({ ...prev, zipFile: files[0] }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (!formState.title || !formState.sphere || !formState.zipFile) {
      alert('Пожалуйста, заполните все обязательные поля')
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

    for (const screenshot of formState.screenshots) {
      formData.append('screenshots', screenshot)
    }
    
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }
    
    try {
      const res = await fetch('/api/models/upload', {
        method: 'POST',
        body: formData,
      })

      const text = await res.text()
      const result = text ? JSON.parse(text) : {}

      if (res.ok && result.success) {
        setModels(result.allModels)
        alert('Модель загружена успешно!')
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

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded mb-8">
        <input
          name="title"
          placeholder="Название"
          value={formState.title}
          onChange={handleChange}
          className="block w-full border px-2 py-1"
          required
        />
        <textarea
          name="description"
          placeholder="Описание"
          value={formState.description}
          onChange={handleChange}
          className="block w-full border px-2 py-1"
        />
        
        <select
          name="authorId"
          value={formState.authorId}
          onChange={handleChange}
          className="block w-full border px-2 py-1"
        >
          <option value="">Выберите автора</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>

        
        <div className="mb-4">
          <label className="block mb-2">Проекты</label>
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

        <select
          name="sphere"
          value={formState.sphere}
          onChange={handleChange}
          required
          className="block w-full border px-2 py-1"
        >
          <option value="">Выберите сферу</option>
          <option value="CONSTRUCTION">Строительство</option>
          <option value="CHEMISTRY">Химия</option>
          <option value="INDUSTRIAL">Промышленность</option>
          <option value="MEDICAL">Медицина</option>
          <option value="OTHER">Другое</option>
        </select>

        <label className="block">ZIP-файл модели *</label>
        <input
          name="zipFile"
          type="file"
          onChange={handleFileChange}
          accept=".zip"
          className="block"
          required
        />

        <label className="block">Скриншоты</label>
        <input
          name="screenshots"
          type="file"
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="block"
        />

        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? 'Загрузка...' : 'Загрузить модель'}
        </button>
      </form>

      {/* {models.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Загруженные модели</h2> */}
          {/* Убедись, что у тебя есть компонент <ModelList /> */}
          {/* <ModelList models={models} /> */}
        {/* </div>
      )} */}
    </div>
  )
}
