'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProjectForm from '@/components/ProjectForm'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)

  // Загрузка проектов
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        const data = await response.json()
        setProjects(data)
      } catch (error) {
        console.error('Ошибка загрузки проектов:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProjects()
  }, [])

  // Поиск проектов
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Обработка добавления/обновления проекта
  const handleProjectSubmit = async (projectData) => {
    try {
      const method = currentProject ? 'PUT' : 'POST'
      const url = currentProject 
        ? `/api/projects/${currentProject.id}`
        : '/api/projects'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      })
      
      if (response.ok) {
        const result = await response.json()
        if (currentProject) {
          setProjects(projects.map(proj => 
            proj.id === currentProject.id ? result : proj
          ))
        } else {
          setProjects([...projects, result])
        }
        setShowAddForm(false)
        setCurrentProject(null)
      }
    } catch (error) {
      console.error('Ошибка сохранения проекта:', error)
    }
  }

  // Обработка удаления проекта
  const handleDelete = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить этот проект?')) return
    
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setProjects(projects.filter(proj => proj.id !== id))
      }
    } catch (error) {
      console.error('Ошибка удаления проекта:', error)
    }
  }

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Проекты</h1>
        <button
          onClick={() => {
            setCurrentProject(null)
            setShowAddForm(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Создать проект
        </button>
      </div>

      {/* Форма поиска */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Найти проект"
          className="border p-2 rounded w-full max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Форма добавления/редактирования проекта */}
      {showAddForm && (
        <ProjectForm
          project={currentProject}
          onSubmit={handleProjectSubmit}
          onCancel={() => {
            setShowAddForm(false)
            setCurrentProject(null)
          }}
        />
      )}

      {/* Таблица проектов */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border text-left">Название</th>
              <th className="py-2 px-4 border text-left">Дата создания</th>
              <th className="py-2 px-4 border text-left">Количество моделей</th>
              <th className="py-2 px-4 border text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{project.name}</td>
                  <td className="py-2 px-4 border">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4 border">{project.models?.length || 0}</td>
                  <td className="py-2 px-4 border">
                    <button 
                      onClick={() => {
                        setCurrentProject(project)
                        setShowAddForm(true)
                      }}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      Редактировать
                    </button>
                    <button 
                      onClick={() => handleDelete(project.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 px-4 border text-center text-gray-500">
                  Проекты не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}