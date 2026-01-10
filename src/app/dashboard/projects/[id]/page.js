'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { checkPermission, checkAnyPermission } from '@/lib/permission';
import apiClient from '@/lib/apiClient'
import Loading from '@/components/Loading'
import { proxyUrl, formatDateTime } from '@/lib/utils'
import { getErrorMessage, handleError } from '@/lib/errorHandler'
import AddModelsToProjectModal from "@/components/AddModelsToProjectModal"
import DeleteReasonModal from "@/components/DeleteReasonModal"
import { 
  ArrowLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

export default function ProjectPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [models, setModels] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userRole, setUserRole] = useState(null)
  const [user, setUser] = useState();
  const [showAddModelsModal, setShowAddModelsModal] = useState(false)
  const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false)
  const [selectedModelForDeletion, setSelectedModelForDeletion] = useState(null)
  const [isDownloading, setIsDownloading] = useState({})
  
  useEffect(() => {
    const load = async () => {
      try {
        const userData = await apiClient.auth.me()
        setUser(userData.user)
      } catch (err) {
        console.error('Ошибка загрузки пользователя:', err)
      }
    }
    load()
  }, [])

  // Загрузка данных проекта и моделей
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Получаем данные пользователя
        const userData = await apiClient.auth.me()
        setUserRole(userData.user?.role || null)

        // Получаем данные проекта
        const projectData = await apiClient.projects.getById(id)
        setProject(projectData)

        // Получаем модели проекта
        const modelsData = await apiClient.models.getAll({ projectId: id })
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
  const handleDownload = async (model, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
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


  const handleDeleteConfirm = async (reason) => {
    if (!selectedModelForDeletion) return;

    try {
      const data = await apiClient.models.requestDeletion(selectedModelForDeletion.id, reason)
      alert(data.message || 'Запрос на удаление отправлен');
      setShowDeleteReasonModal(false);
      setSelectedModelForDeletion(null);
      // Обновляем список моделей
      const modelsData = await apiClient.models.getAll({ projectId: id })
      setModels(modelsData)
    } catch (error) {
      const formattedError = await handleError(error, { context: 'ProjectPage.handleDeleteConfirm', modelId: selectedModelForDeletion.id, projectId: id })
      const errorMessage = getErrorMessage(formattedError)
      alert(errorMessage)
    }
  }

  const handleDeleteRequest = async (model, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (userRole === 'ADMIN') {
      if (confirm('Вы уверены, что хотите удалить эту модель?')) {
        try {
          const data = await apiClient.models.delete(model.id, true)
          if (data.success || data.message) {
            setModels(prev => prev.filter(m => m.id !== model.id));
            alert('Модель успешно удалена');
          } else {
            throw new Error(data.error || 'Ошибка при удалении');
          }
        } catch (error) {
          const formattedError = await handleError(error, { context: 'ProjectPage.handleDeleteRequest', modelId: model.id, projectId: id })
          const errorMessage = getErrorMessage(formattedError)
          alert(errorMessage)
        }
      }
    } else {
      // Для не-админов показываем модальное окно с формой
      setSelectedModelForDeletion(model);
      setShowDeleteReasonModal(true);
    }
  }

  // Фильтрация и сортировка моделей
  const filteredModels = models
    .filter(model => 
      model.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.author?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  if (isLoading) {
    return (
      <div className="min-h-full bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-center items-center h-64">
          <Loading />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-full bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center py-8">
          <div className="text-red-500 mb-4">Проект не найден</div>
          <button 
            onClick={() => router.push('/dashboard/projects')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            Вернуться к списку проектов
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Заголовок и кнопки */}
        <div className="mb-6 pb-6 border-b border-gray-200 flex justify-between items-end gap-4 relative">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute -left-12 top-0 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Назад"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 leading-none pb-0">
              {project.name}
              {project.city && (
                <span className="text-lg font-normal text-gray-600 ml-3">• {project.city}</span>
              )}
            </h1>
          </div>
          {(userRole === 'ADMIN' || checkPermission(user, 'upload_models')) && (
            <button
              onClick={() => setShowAddModelsModal(true)}
              className="group relative inline-flex items-center h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium cursor-pointer flex-shrink-0 overflow-hidden"
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

        {/* Поиск */}
        <div className="mb-6">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию или автору..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Сетка моделей */}
        {filteredModels.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'Модели не найдены' : 'Нет моделей'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Очистить фильтры
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredModels.map((model) => (
              <div
                key={model.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-gray-300"
              >
                {/* Превью изображения */}
                <Link
                  href={`/dashboard/models/${model.id}?projectid=${id}`}
                  className="block relative aspect-square bg-gray-100 overflow-hidden group"
                >
                  {model.images && model.images.length > 0 ? (
                    <img
                      src={proxyUrl(model.images[0])}
                      alt={model.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23e5e7eb" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="24"%3EНет изображения%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 cursor-pointer">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}
                </Link>

                {/* Контент карточки */}
                <div className="p-4">
                  <Link href={`/dashboard/models/${model.id}?projectid=${id}`}>
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors">
                      {model.title}
                    </h3>
                  </Link>
                  
                  <div className="space-y-2 mb-4">
                    {model.author && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="truncate">{model.author.name}</span>
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
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Скачать"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                      )}
                      {checkAnyPermission(user, 'edit_models', 'edit_model_description') && (
                        <Link
                          href={`/dashboard/models/update/${model.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Редактировать"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                      )}
                      {checkPermission(user, 'delete_models') && (
                        <button
                          onClick={(e) => handleDeleteRequest(model, e)}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Удалить"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}


        {showAddModelsModal && (
          <AddModelsToProjectModal
            projectId={id}
            existingModelIds={models.map(m => m.id)}
            onClose={() => setShowAddModelsModal(false)}
            onAdd={async (selectedModelIds) => {
              try {
                // Получаем текущие модели проекта
                const currentModelIds = models.map(m => m.id)
                // Объединяем существующие модели с новыми
                const allModelIds = [...new Set([...currentModelIds, ...selectedModelIds])]
                
                // Обновляем проект
                await apiClient.projects.update(id, {
                  name: project.name,
                  city: project.city,
                  modelIds: allModelIds
                })

                // Перезагружаем данные
                const projectData = await apiClient.projects.getById(id)
                setProject(projectData)

                const modelsData = await apiClient.models.getAll({ projectId: id })
                setModels(modelsData)

                setShowAddModelsModal(false)
              } catch (error) {
                const formattedError = await handleError(error, { context: 'ProjectPage.onAdd', projectId: id, modelIds: selectedModelIds })
                const errorMessage = getErrorMessage(formattedError)
                alert(errorMessage)
              }
            }}
          />
        )}

        <DeleteReasonModal
          isOpen={showDeleteReasonModal}
          onClose={() => {
            setShowDeleteReasonModal(false)
            setSelectedModelForDeletion(null)
          }}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </div>
  )
}