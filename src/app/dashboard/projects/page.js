'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProjectForm from '@/components/ProjectForm'
import Image from 'next/image'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import Delete from "../../../../public/Delete.svg"
import Edit from "../../../../public/Edit.svg"

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)
  const [userRole, setUserRole] = useState(null) 

  // Загрузка проектов
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        const data = await response.json()
        setProjects(data)
        const userResponse = await fetch('/api/auth/me')
        const userData = await userResponse.json()
        setUserRole(userData.user?.role || null)
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
      console.log(projectData)
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
  const handleDelete = async (project) => {
    if (!confirm('Вы уверены, что хотите удалить этот проект?')) return
    
    const id = project.id

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(project),
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок и кнопки */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Проекты</h1>
          
          {userRole === 'ADMIN' && (
          <div className="flex gap-4">
            <button
              onClick={() => {
                setCurrentProject(null)
                setShowAddForm(true)
              }}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 shadow-sm transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Добавить проект
            </button>
          </div>
          )}
        </div>

        {/* Поиск */}
        <div className="mb-6">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Найти проект"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Форма проекта */}
        {showAddForm && (
          <div 
            className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
            // onClick={() => setShowAddForm(false)}
          >
            <ProjectForm
              project={currentProject}
              onSubmit={handleProjectSubmit}
              onCancel={() => {
                setShowAddForm(false)
                setCurrentProject(null)
              }}
            />
          </div>
        )}

        {/* Таблица проектов */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата создания
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Кол-во моделей
                </th>
                {userRole === 'ADMIN' && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 odd:bg-blue-50 even:bg-white">
                    <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link href={`/dashboard/models/${project.id}`}>
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(project.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                      {project.models?.length || 0}
                    </td>
                    
                    {userRole === 'ADMIN' && (
                      <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => {
                              setCurrentProject(project)
                              setShowAddForm(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Image 
                              src={Edit} 
                              alt="Редактировать" 
                              width={20} 
                              height={20}
                            />
                          </button>
                          <button
                            onClick={() => handleDelete(project)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Image 
                              src={Delete} 
                              alt="Удалить" 
                              width={20} 
                              height={20}
                            />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                    Проекты не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}