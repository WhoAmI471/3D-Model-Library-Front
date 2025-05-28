'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [models, setModels] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProjects, setSelectedProjects] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const userRes = await axios.get('/api/auth/me')
        setUser(userRes.data.user)

        const modelsRes = await axios.get('/api/models')
        setModels(modelsRes.data)

        const projectsRes = await axios.get('/api/projects')
        setProjects(projectsRes.data)
      } catch (err) {
        router.push('/login')
      }
    }

    load()
  }, [])

  const handleLogout = async () => {
    await axios.post('/api/auth/logout')
    router.push('/login')
  }

  const handleUpload = async () => {
    router.push('/dashboard/models/upload')
  }

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedModels = [...models].sort((a, b) => {
    if (sortConfig.key) {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
    }
    return 0
  })

  const filteredModels = selectedProjects.length > 0
    ? sortedModels.filter(model => 
        selectedProjects.includes(model.project?.id)
      )
    : sortedModels

  const toggleProjectFilter = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Модели</h2>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowProjectFilter(!showProjectFilter)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Фильтр по проектам
            </button>
            <button 
              onClick={handleUpload} 
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              ➕ Добавить модель
            </button>
          </div>
        </div>

        {/* Модальное окно фильтра по проектам */}
        {showProjectFilter && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Фильтр по проектам</h3>
              <div className="max-h-96 overflow-y-auto">
                {projects.map(project => (
                  <div key={project.id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`project-${project.id}`}
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => toggleProjectFilter(project.id)}
                      className="mr-2"
                    />
                    <label htmlFor={`project-${project.id}`}>{project.name}</label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowProjectFilter(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Таблица моделей */}
        <table className="w-full bg-white shadow rounded overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th 
                className="p-3 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => requestSort('title')}
              >
                Название {getSortIcon('title')}
              </th>
              <th 
                className="p-3 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => requestSort('project.name')}
              >
                Проект {getSortIcon('project.name')}
              </th>
              <th className="p-3 text-left">Автор</th>
              <th className="p-3 text-center">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredModels.map((model) => (
              <tr key={model.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{model.title}</td>
                <td className="p-3">{model.project?.name || '—'}</td>
                <td className="p-3">{model.author?.name || '—'}</td>
                <td className="p-3 text-center space-x-2">
                  <Link href={`/dashboard/models/${model.id}`}>
                    <button className="text-blue-600 hover:underline">Открыть</button>
                  </Link>
                  <Link href={`/dashboard/models/update/${model.id}`}>
                    <button className="text-yellow-600 hover:underline">✏️</button>
                  </Link>
                  <button className="text-red-600 hover:underline">❌</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  )
}