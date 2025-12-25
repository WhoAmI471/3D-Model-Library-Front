'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkAnyPermission, checkPermission } from '@/lib/permission'
import axios from 'axios'
import { proxyUrl, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import DeleteReasonModal from "@/components/DeleteReasonModal"
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [models, setModels] = useState([])
  const [projects, setProjects] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [isDownloading, setIsDownloading] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false)
  const [selectedModelForDeletion, setSelectedModelForDeletion] = useState(null)

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
  }, [router])

  const handleDownload = async (model, e) => {
    e.stopPropagation()
    setIsDownloading(prev => ({ ...prev, [model.id]: true }))
    try {
      const response = await fetch(proxyUrl(model.fileUrl))
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
      setIsDownloading(prev => ({ ...prev, [model.id]: false }))
    }
  }

  const handleDeleteRequest = (model, e) => {
    e.stopPropagation()
    if (user?.role === 'ADMIN') {
      if (confirm('Вы уверены, что хотите удалить эту модель?')) {
        fetch(`/api/models/${model.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approve: true })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success || data.message) {
            setModels(prev => prev.filter(m => m.id !== model.id))
            alert('Модель успешно удалена')
          } else {
            throw new Error(data.error || 'Ошибка при удалении')
          }
        })
        .catch(error => {
          console.error('Ошибка при удалении:', error)
          alert(error.message)
        })
      }
    } else {
      setSelectedModelForDeletion(model)
      setShowDeleteReasonModal(true)
    }
  }

  const handleDeleteConfirm = async (reason) => {
    if (!selectedModelForDeletion) return

    try {
      const response = await axios.put(`/api/models/${selectedModelForDeletion.id}`, {
        comment: reason
      })
      
      if (response.status === 200) {
        alert(response.data.message)
        setShowDeleteReasonModal(false)
        setSelectedModelForDeletion(null)
        setModels(prev => prev.filter(m => m.id !== selectedModelForDeletion.id))
      } else {
        throw new Error(response.data.error || 'Ошибка при отправке запроса')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      alert(error.response?.data?.error || error.message)
    }
  }

  const handleUpload = () => {
    router.push('/dashboard/models/upload')
  }

  const filteredModels = models
    .filter(model => {
      // Фильтрация по вкладке проекта
      if (activeTab === 'all') return true
      return model.projects?.some(project => project.id === activeTab)
    })
    .filter(model => {
      // Фильтрация по поиску
      if (!searchTerm) return true
      
      const searchLower = searchTerm.toLowerCase()
      return (
        model.title?.toLowerCase().includes(searchLower) ||
        (model.author?.name?.toLowerCase().includes(searchLower)) ||
        (model.projects?.some(p => p.name.toLowerCase().includes(searchLower)))
      )
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          {/* Поиск и кнопка добавления */}
          <div className="mb-6 flex gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию, автору или проекту..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {checkPermission(user, 'upload_models') && (
              <button 
                onClick={handleUpload}
                className="group relative inline-flex items-center h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium cursor-pointer"
                style={{ 
                  width: '2.5rem', 
                  paddingLeft: '0.625rem', 
                  paddingRight: '0.625rem',
                  transition: 'width 0.2s, padding-right 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.setProperty('width', '195px', 'important')
                  e.currentTarget.style.setProperty('padding-right', '2rem', 'important')
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.setProperty('width', '2.5rem', 'important')
                  e.currentTarget.style.setProperty('padding-right', '0.625rem', 'important')
                }}
                title="Добавить модель"
              >
                <PlusIcon className="h-5 w-5 flex-shrink-0" style={{ color: '#ffffff', strokeWidth: 2 }} />
                <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Добавить модель
                </span>
              </button>
            )}
          </div>

          {/* Вкладки проектов */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Все модели
                <span className={`ml-1.5 text-xs ${activeTab === 'all' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {models.length}
                </span>
              </button>
              {projects.map((project) => {
                const projectModelsCount = models.filter(model =>
                  model.projects?.some(p => p.id === project.id)
                ).length
                
                return (
                  <button
                    key={project.id}
                    onClick={() => setActiveTab(project.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === project.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {project.name}
                    <span className={`ml-1.5 text-xs ${activeTab === project.id ? 'text-blue-100' : 'text-gray-500'}`}>
                      {projectModelsCount}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Сетка моделей */}
        {filteredModels.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              {searchTerm || activeTab !== 'all'
                ? 'Модели не найдены'
                : 'Нет моделей'}
            </p>
            {(searchTerm || activeTab !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setActiveTab('all')
                }}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Очистить фильтры
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredModels.map((model) => (
              <Link
                key={model.id}
                href={`/dashboard/models/${model.id}`}
                className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-gray-300"
              >
                {/* Превью изображения */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  {model.images && model.images.length > 0 ? (
                    <img
                      src={proxyUrl(model.images[0])}
                      alt={model.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23e5e7eb" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="24"%3EНет изображения%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Контент карточки */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {model.title}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    {model.author && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="truncate">{model.author.name}</span>
                      </div>
                    )}
                    {model.projects && model.projects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {model.projects.slice(0, 2).map(project => (
                          <span
                            key={project.id}
                            className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                          >
                            {project.name}
                          </span>
                        ))}
                        {model.projects.length > 2 && (
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            +{model.projects.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Действия */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {formatDateTime(model.updatedAt)}
                    </span>
                    <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                      {checkPermission(user, 'download_models') && (
                        <button
                          onClick={(e) => handleDownload(model, e)}
                          disabled={isDownloading[model.id]}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Скачать"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                      )}
                      {checkAnyPermission(user, 'edit_models', 'edit_model_description') && (
                        <Link
                          href={`/dashboard/models/update/${model.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Редактировать"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                      )}
                      {checkPermission(user, 'delete_models') && (
                        <button
                          onClick={(e) => handleDeleteRequest(model, e)}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Удалить"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <DeleteReasonModal
        isOpen={showDeleteReasonModal}
        onClose={() => {
          setShowDeleteReasonModal(false)
          setSelectedModelForDeletion(null)
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}


