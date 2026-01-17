'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { checkPermission, checkAnyPermission, canEditModel } from '@/lib/permission'
import { ALL_PERMISSIONS } from '@/lib/roles'
import apiClient from '@/lib/apiClient'
import Loading from '@/components/Loading'
import { proxyUrl, formatDateTime } from '@/lib/utils'
import { getErrorMessage, handleError } from '@/lib/errorHandler'
import { useNotification } from '@/hooks/useNotification'
import { useConfirm } from '@/hooks/useConfirm'
import AddModelsToSphereModal from "@/components/AddModelsToSphereModal"
import DeleteReasonModal from "@/components/DeleteReasonModal"
import ConfirmModal from "@/components/ConfirmModal"
import SphereForm from "@/components/SphereForm"
import { 
  ArrowLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

export default function SpherePage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [sphere, setSphere] = useState(null)
  const [models, setModels] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userRole, setUserRole] = useState(null)
  const [user, setUser] = useState()
  const [showAddModelsModal, setShowAddModelsModal] = useState(false)
  const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false)
  const [selectedModelForDeletion, setSelectedModelForDeletion] = useState(null)
  const [isDownloading, setIsDownloading] = useState({})
  const [showEditForm, setShowEditForm] = useState(false)
  const [currentSphereForEdit, setCurrentSphereForEdit] = useState(null)
  const { success, error: showError } = useNotification()
  const { isOpen, message, title, confirmText, cancelText, variant, showConfirm, handleConfirm, handleCancel } = useConfirm()
  
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

  // Загрузка данных сферы и моделей
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Получаем данные пользователя
        const userData = await apiClient.auth.me()
        setUserRole(userData.user?.role || null)

        // Получаем данные сферы с моделями
        const sphereData = await apiClient.spheres.getById(id)
        setSphere(sphereData)
        setModels(sphereData.models || [])
        
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
        router.push('/dashboard/spheres')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, router])

  // Получение версии модели
  const getModelVersion = (model) => {
    if (model.versions && model.versions.length > 0) {
      const sortedVersions = [...model.versions].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )
      return sortedVersions[0].version
    }
    return '1.0'
  }

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
      const version = getModelVersion(model)
      a.download = `${model.title}_v${version}.zip` || 'model.zip'
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
      const formattedError = await handleError(error, { context: 'SpherePage.handleDeleteConfirm', modelId: selectedModelForDeletion.id, sphereId: id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
    }
  }

  const handleDeleteRequest = async (model, e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    // Если модель уже помечена на удаление, не обрабатываем запрос
    if (model.markedForDeletion) {
      return
    }
    if (userRole === 'ADMIN') {
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
          const formattedError = await handleError(error, { context: 'SpherePage.handleDeleteRequest', modelId: model.id, sphereId: id })
          const errorMessage = getErrorMessage(formattedError)
          showError(errorMessage)
        }
      }
    } else {
      // Для не-админов показываем модальное окно с формой
      setSelectedModelForDeletion(model)
      setShowDeleteReasonModal(true)
    }
  }

  // Обработка редактирования сферы
  const handleEdit = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    try {
      // Загружаем полную сферу с моделями
      const fullSphere = await apiClient.spheres.getById(id)
      setCurrentSphereForEdit(fullSphere)
      setShowEditForm(true)
    } catch (error) {
      const formattedError = await handleError(error, { context: 'SpherePage.handleEdit', sphereId: id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
    }
  }

  // Обработка отправки формы редактирования сферы
  const handleSphereSubmit = async (sphereData) => {
    try {
      await apiClient.spheres.update(id, sphereData)
      success('Сфера успешно обновлена')
      
      // Перезагружаем данные сферы
      const updatedSphere = await apiClient.spheres.getById(id)
      setSphere(updatedSphere)
      setModels(updatedSphere.models || [])
      
      setShowEditForm(false)
      setCurrentSphereForEdit(null)
    } catch (error) {
      const formattedError = await handleError(error, { context: 'SpherePage.handleSphereSubmit', sphereId: id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
      throw error
    }
  }

  // Обработка удаления сферы
  const handleDeleteSphere = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    const confirmed = await showConfirm({
      message: `Вы уверены, что хотите удалить сферу "${sphere.name}"?${models.length > 0 ? ` К сфере привязано ${models.length} моделей, они будут автоматически отвязаны.` : ''}`,
      variant: 'danger',
      confirmText: 'Удалить'
    })
    
    if (!confirmed) return

    try {
      const data = await apiClient.spheres.delete(id)
      if (data && data.success) {
        success('Сфера успешно удалена')
        router.push('/dashboard/spheres')
      } else {
        showError(data?.error || 'Ошибка удаления сферы')
      }
    } catch (error) {
      const formattedError = await handleError(error, { context: 'SpherePage.handleDeleteSphere', sphereId: id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
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

  if (!sphere) {
    return (
      <div className="min-h-full bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center py-8">
          <div className="text-red-500 mb-4">Сфера не найдена</div>
          <button 
            onClick={() => router.push('/dashboard/spheres')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            Вернуться к списку сфер
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
              {sphere.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Моделей: {models.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(user?.role === 'ADMIN' || checkPermission(user, ALL_PERMISSIONS.EDIT_SPHERE)) && (
              <button
                onClick={handleEdit}
                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                title="Редактировать сферу"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            )}
            {user?.role === 'ADMIN' && (
              <button
                onClick={handleDeleteSphere}
                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                title="Удалить сферу"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
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
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
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
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-gray-300 flex flex-col"
              >
                {/* Превью изображения */}
                <Link
                  href={`/dashboard/models/${model.id}?sphereid=${id}`}
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
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex-1">
                    <Link href={`/dashboard/models/${model.id}?sphereid=${id}`}>
                      <h3 className="font-semibold text-gray-900 mb-2 cursor-pointer hover:text-blue-600 transition-colors" title={model.title}>
                        {model.title && model.title.length > 25 ? `${model.title.substring(0, 25)}...` : model.title}
                      </h3>
                    </Link>
                    
                    <div className="space-y-2">
                      {model.author && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="truncate">{model.author.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-4">
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
                      {canEditModel(user, model) && (
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
        )}

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

        {showEditForm && (
          <SphereForm
            sphere={currentSphereForEdit}
            onSubmit={handleSphereSubmit}
            onCancel={() => {
              setShowEditForm(false)
              setCurrentSphereForEdit(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
