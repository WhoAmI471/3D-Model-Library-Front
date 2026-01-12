'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkAnyPermission, checkPermission } from '@/lib/permission'
import apiClient from '@/lib/apiClient'
import { proxyUrl, formatDateTime } from '@/lib/utils'
import { getErrorMessage, handleError } from '@/lib/errorHandler'
import { useNotification } from '@/hooks/useNotification'
import { useConfirm } from '@/hooks/useConfirm'
import Link from 'next/link'
import DeleteReasonModal from "@/components/DeleteReasonModal"
import ConfirmModal from "@/components/ConfirmModal"
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
  const [spheres, setSpheres] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [isDownloading, setIsDownloading] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false)
  const [selectedModelForDeletion, setSelectedModelForDeletion] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 16

  const router = useRouter()
  const { success, error: showError } = useNotification()
  const { isOpen, message, title, confirmText, cancelText, variant, showConfirm, handleConfirm, handleCancel } = useConfirm()

  useEffect(() => {
    const load = async () => {
      try {
        const userData = await apiClient.auth.me()
        setUser(userData.user)

        const modelsData = await apiClient.models.getAll()
        setModels(modelsData)

        const spheresData = await apiClient.spheres.getAll()
        setSpheres(spheresData)
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

  const handleDeleteRequest = async (model, e) => {
    e.stopPropagation()
    // Если модель уже помечена на удаление, не обрабатываем запрос
    if (model.markedForDeletion) {
      return
    }
    if (user?.role === 'ADMIN') {
      const confirmed = await showConfirm({
        message: `Вы уверены, что хотите удалить модель "${model.title}"?`,
        variant: 'danger',
        confirmText: 'Удалить'
      })
      
      if (confirmed) {
        try {
          const data = await apiClient.models.delete(model.id, true)
          if (data.success || data.message) {
            setModels(prev => prev.filter(m => m.id !== model.id))
            success('Модель успешно удалена')
          } else {
            throw new Error(data.error || 'Ошибка при удалении')
          }
        } catch (error) {
          const formattedError = await handleError(error, { context: 'DashboardPage.handleDeleteRequest', modelId: model.id })
          const errorMessage = getErrorMessage(formattedError)
          showError(errorMessage)
        }
      }
    } else {
      setSelectedModelForDeletion(model)
      setShowDeleteReasonModal(true)
    }
  }

  const handleDeleteConfirm = async (reason) => {
    if (!selectedModelForDeletion) return

    try {
      const data = await apiClient.models.requestDeletion(selectedModelForDeletion.id, reason)
      success(data.message || 'Запрос на удаление отправлен')
      setShowDeleteReasonModal(false)
      // Помечаем модель как ожидающую удаления, не удаляя из списка
      setModels(prev => prev.map(m => 
        m.id === selectedModelForDeletion.id 
          ? { ...m, markedForDeletion: true }
          : m
      ))
      setSelectedModelForDeletion(null)
    } catch (error) {
      const formattedError = await handleError(error, { context: 'DashboardPage.handleDeleteConfirm', modelId: selectedModelForDeletion.id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
    }
  }

  const handleUpload = () => {
    router.push('/dashboard/models/upload')
  }

  // Сортировка сфер: по количеству моделей, "Другое" в конце
  const sortedSpheres = [...spheres].sort((a, b) => {
    const aCount = models.filter(model => model.sphere?.id === a.id).length
    const bCount = models.filter(model => model.sphere?.id === b.id).length
    
    // Если одна из сфер называется "Другое", она идет в конец
    if (a.name === 'Другое') return 1
    if (b.name === 'Другое') return -1
    
    // Остальные сортируем по количеству моделей (от большего к меньшему)
    return bCount - aCount
  })

  const filteredModels = models
    .filter(model => {
      // Фильтрация по вкладке сферы
      if (activeTab === 'all') return true
      return model.sphere?.id === activeTab
    })
    .filter(model => {
      // Фильтрация по поиску
      if (!searchTerm) return true
      
      const searchLower = searchTerm.toLowerCase()
      return (
        model.title?.toLowerCase().includes(searchLower) ||
        (model.author?.name?.toLowerCase().includes(searchLower)) ||
        (model.sphere?.name?.toLowerCase().includes(searchLower)) ||
        (model.projects?.some(p => p.name.toLowerCase().includes(searchLower)))
      )
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchTerm])

  // Пагинация
  const totalPages = Math.ceil(filteredModels.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedModels = filteredModels.slice(startIndex, endIndex)

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Модели</h1>
        <div className="mb-8">
          {/* Поиск и кнопка добавления */}
          <div className="mb-6 flex gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию, автору, сфере или проекту..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {checkPermission(user, 'upload_models') && (
              <button 
                onClick={handleUpload}
                className="group relative inline-flex items-center h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium cursor-pointer overflow-hidden"
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

          {/* Вкладки сфер */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
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
              <div className="h-6 w-px bg-gray-300"></div>
              {sortedSpheres.map((sphere) => {
                const sphereModelsCount = models.filter(model =>
                  model.sphere?.id === sphere.id
                ).length
                
                return (
                  <button
                    key={sphere.id}
                    onClick={() => setActiveTab(sphere.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                      activeTab === sphere.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sphere.name}
                    <span className={`ml-1.5 text-xs ${activeTab === sphere.id ? 'text-blue-100' : 'text-gray-500'}`}>
                      {sphereModelsCount}
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
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                Очистить фильтры
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedModels.map((model) => (
              <div
                key={model.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-gray-300"
              >
                {/* Превью изображения */}
                <Link
                  href={`/dashboard/models/${model.id}`}
                  className="block relative aspect-square bg-gray-100 overflow-hidden group"
                >
                  {model.markedForDeletion && (
                    <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded shadow-lg">
                      Ожидает удаления
                    </div>
                  )}
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
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
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
                          <Link
                            key={project.id}
                            href={`/dashboard/models/${model.id}`}
                            className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                          >
                            {project.name}
                          </Link>
                        ))}
                        {model.projects.length > 2 && (
                          <Link
                            href={`/dashboard/models/${model.id}`}
                            className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                          >
                            +{model.projects.length - 2}
                          </Link>
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
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
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
                          disabled={model.markedForDeletion}
                          className={`p-1.5 rounded transition-colors ${
                            model.markedForDeletion
                              ? 'text-gray-400 cursor-not-allowed opacity-50'
                              : 'text-gray-600 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                          }`}
                          title={model.markedForDeletion ? 'Запрос на удаление уже активен для этой модели' : 'Удалить'}
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

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
                  >
                    Назад
                  </button>
                  <div className="flex items-center px-4 text-sm text-gray-600">
                    Страница {currentPage} из {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            )}
          </>
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

      <ConfirmModal
        isOpen={isOpen}
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        variant={variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  )
}


