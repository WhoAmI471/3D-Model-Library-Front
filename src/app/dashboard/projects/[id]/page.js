'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { checkPermission } from '@/lib/permission';

import Download from "../../../../../public/Download.svg"
import Delete from "../../../../../public/Delete.svg"
import Edit from "../../../../../public/Edit.svg"

export default function ProjectPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [models, setModels] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [userRole, setUserRole] = useState(null)
  const [isDownloading, setIsDownloading] = useState(false)

  // Загрузка данных проекта и моделей
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Получаем данные пользователя
        const userRes = await fetch('/api/auth/me')
        const userData = await userRes.json()
        setUserRole(userData.user?.role || null)

        // Получаем данные проекта
        const projectRes = await fetch(`/api/projects/${id}`)
        if (!projectRes.ok) throw new Error('Проект не найден')
        const projectData = await projectRes.json()
        setProject(projectData)

        // Получаем модели проекта
        const modelsRes = await fetch(`/api/models?projectId=${id}`)
        const modelsData = await modelsRes.json()
        setModels(modelsData)
        
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
        router.push('/dashboard/projects')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, router])

  // Скачивание модели
  const handleDownload = async (model) => {
    setIsDownloading(true)
    try {
      const response = await fetch(model.fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${model.title}.zip` || 'model.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Ошибка при скачивании:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDeleteRequest = async (model) => {
    if (userRole === 'ADMIN') {
      if (confirm('Вы уверены, что хотите удалить эту модель?')) {
        try {
          const response = await fetch(`/api/models/${model.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ approve: true })
          });
          
          const data = await response.json();
          
          if (response.ok) {
            setModels(prev => prev.filter(m => m.id !== model.id));
            alert('Модель успешно удалена');
          } else {
            throw new Error(data.error || 'Ошибка при удалении');
          }
        } catch (error) {
          console.error('Ошибка при удалении:', error);
          alert(error.message);
        }
      }
    } else {
      if (confirm('Отправить запрос на удаление администратору?')) {
        try {
          // Для обычных пользователей - PUT запрос для пометки на удаление
          const response = await axios.put(`/api/models/${model.id}`, {
            action: 'REQUEST_DELETE'
          });
          
          if (response.status === 200) {
            alert(response.data.message);
          } else {
            throw new Error(response.data.error || 'Ошибка при отправке запроса');
          }
        } catch (error) {
          console.error('Ошибка:', error);
          alert(error.message);
        }
      }
    }
  }

  // Сортировка таблицы
  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Иконка сортировки
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  // Сортировка моделей
  const sortedModels = [...models].sort((a, b) => {
    if (sortConfig.key) {
      // Для вложенных свойств (например, author.name)
      const keys = sortConfig.key.split('.')
      let valueA = a
      let valueB = b
      
      for (const key of keys) {
        valueA = valueA?.[key]
        valueB = valueB?.[key]
      }

      if (valueA < valueB) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (valueA > valueB) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
    }
    return 0
  })

  // Фильтрация по поиску
  const filteredModels = sortedModels.filter(model => 
    model.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.author?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto text-center py-8">
          <div className="text-red-500 mb-4">Проект не найден</div>
          <button 
            onClick={() => router.push('/dashboard/projects')}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            Вернуться к списку проектов
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок и кнопки */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Создан: {format(new Date(project.createdAt), 'dd.MM.yyyy', { locale: ru })}
            </p>
          </div>
          
          {(userRole === 'ADMIN' || checkPermission(userRole, 'upload_models')) && (
            <div className="flex gap-4">
              <button
                onClick={() => router.push(`/dashboard/models/upload?projectId=${project.id}`)}
                className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 shadow-sm transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Добавить модель
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
              placeholder="Найти модель по названию или автору"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Таблица моделей */}
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
                    Название модели
                    {getSortIcon('title')}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('author.name')}
                >
                  <div className="flex items-center">
                    Автор
                    {getSortIcon('author.name')}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('createdAt')}
                >
                  <div className="flex items-center">
                    Дата создания
                    {getSortIcon('createdAt')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredModels.length > 0 ? (
                filteredModels.map((model) => (
                  <tr key={model.id} className="hover:bg-gray-50 odd:bg-blue-50 even:bg-white">
                    <td 
                      className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900" 
                      onClick={() => router.push(`/dashboard/models/${model.id}`)}>
                      {model.title}
                    </td>
                    <td 
                      className="px-6 py-2 whitespace-nowrap text-sm text-gray-500" 
                      onClick={() => router.push(`/dashboard/models/${model.id}`)}>
                      {model.author?.name || '—'}
                    </td>
                    <td 
                      className="px-6 py-2 whitespace-nowrap text-sm text-gray-500" 
                      onClick={() => router.push(`/dashboard/models/${model.id}`)}>
                      {format(new Date(model.createdAt), 'dd.MM.yyyy', { locale: ru })}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap al-i-center text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        
                        {(checkPermission(userRole, 'edit_models') || checkPermission(userRole, 'edit_model_description')) && (
                          <Link href={`/dashboard/models/update/${model.id}`}>
                            <button className="text-yellow-600 hover:text-yellow-900">
                              <Image 
                                src={Edit} 
                                alt="Редактировать" 
                                width={20} 
                                height={20}
                                className='mt-1'
                              />
                            </button>
                          </Link>)
                        }
                        
                        {checkPermission(userRole, 'delete_models') && (
                          <button 
                            onClick={() => handleDeleteRequest(model)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Image 
                              src={Delete} 
                              alt="Удалить" 
                              width={19} 
                              height={19}
                            />
                          </button>)
                        }
                        
                        {checkPermission(userRole, 'download_models') && (
                          <button 
                            className="text-blue-600 hover:text-blue-900" 
                            onClick={() => handleDownload(model)}
                            disabled={isDownloading}
                          >
                            <Image 
                              src={Download} 
                              alt="Скачать" 
                              width={19} 
                              height={20}
                            />
                          </button>)
                        }
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                    Модели не найдены
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