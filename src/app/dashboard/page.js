'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
// import { FolderIcon, CubeIcon, UsersIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import axios from 'axios'
import Link from 'next/link'
import Image from 'next/image'

import Download from "../../../public/Download.svg"
import Delete from "../../../public/Delete.svg"
import Edit from "../../../public/Edit.svg"


export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [models, setModels] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProjects, setSelectedProjects] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false);
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

  
  const handleDownload = async (model) => {
    setIsDownloading(true);
    try {
      const response = await fetch(model.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model.title}.zip` || 'model.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Ошибка при скачивании:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteRequest = async (model) => {
    if (user.Role === 'ADMIN') {
      if (confirm('Вы уверены, что хотите удалить эту модель?')) {
        const result = await onDeleteRequest(model.id, true);
        if (result?.success && result.redirect) {
          router.push(result.redirect);
        }
      }
    } else {
      if (confirm('Отправить запрос на удаление администратору?')) {
        try {
          const response = await fetch(`/api/models/${model.id}`, {
            method: 'PUT'
          });
          
          const result = await response.json();
          
          if (response.ok) {
            alert(result.message);
            router.refresh(); // Обновляем страницу
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          alert(error.message);
        }
      }
    }
  };

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
      model.projects?.some(project => 
        selectedProjects.includes(project.id)
      )
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
            {/* Кнопка фильтра */}
            <button 
              onClick={() => setShowProjectFilter(!showProjectFilter)}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Фильтр
            </button>
            
            {/* Кнопка добавления */}
            <button 
              onClick={handleUpload}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 shadow-sm "
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Добавить модель
            </button>
          </div>
        </div>

        {/* Модальное окно фильтра */}
        {showProjectFilter && (
          <div 
            className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
            onClick={() => setShowProjectFilter(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium">Фильтр по проектам</h3>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {projects.map(project => (
                  <div key={project.id} className="flex items-center py-2">
                    <input
                      type="checkbox"
                      id={`project-${project.id}`}
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => toggleProjectFilter(project.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor={`project-${project.id}`} className="ml-3 block text-gray-700">
                      {project.name}
                    </label>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t flex justify-end">
                <button
                  onClick={() => setShowProjectFilter(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Таблица */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('title')}
                >
                  <div className="flex items-center">
                    Название
                    {getSortIcon('title')}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('project.name')}
                >
                  <div className="flex items-center">
                    Проект
                    {getSortIcon('project.name')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Автор
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredModels.map((model) => (
                <tr key={model.id} className="hover:bg-gray-50 odd:bg-blue-50 even:bg-white">
                  <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link href={`/dashboard/models/${model.id}`}>
                      {model.title}
                    </Link>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                    {model.projects?.length > 0 ? model.projects.map(p => p.name).join(', ') : '—'}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                    {model.author?.name || '—'}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      
                      <Link href={`/dashboard/models/update/${model.id}`}>
                        <button className="text-yellow-600 hover:text-yellow-900">
                          <Image 
                            src={Edit} 
                            alt="DigiTech Logo" 
                            width={20} 
                            height={20}
                          />
                          {/* Редактировать */}
                        </button>
                      </Link>
                      <button 
                        onClick={() => handleDeleteRequest(model)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Image 
                          src={Delete} 
                          alt="DigiTech Logo" 
                          width={20} 
                          height={20}
                        />
                        {/* Удалить */}
                      </button>
                      <button 
                        className="text-blue-600 hover:text-blue-900" 
                        onClick={() => handleDownload(model)}>
                        <Image 
                          src={Download} 
                          alt="DigiTech Logo" 
                          width={20} 
                          height={20}
                        />
                        {/* Открыть */}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}