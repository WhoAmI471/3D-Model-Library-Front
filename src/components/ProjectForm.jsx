'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { proxyUrl } from '@/lib/utils'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import { checkPermission } from '@/lib/permission'
import { ALL_PERMISSIONS } from '@/lib/roles'
import { useModelsData } from '@/hooks/useModelsData'
import { useModal } from '@/hooks/useModal'
import { usePagination } from '@/hooks/usePagination'
import { projectSchema } from '@/lib/validations/projectSchema'
import { handleError, getErrorMessage } from '@/lib/errorHandler'
import { ApiError } from '@/lib/apiClient'

export default function ProjectForm({ project, onSubmit, onCancel }) {
  const router = useRouter()
  const { models, spheres, currentUser, isLoading: isLoadingModels } = useModelsData()
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [imageError, setImageError] = useState('')
  const modelsPerPage = 12

  const modalHandlers = useModal(onCancel)

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    setValue,
    setError,
    watch,
    reset
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      city: '',
      modelIds: []
    }
  })

  const watchedModelIds = watch('modelIds')

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        city: project.city || '',
        modelIds: project.models?.map(model => model.id) || []
      })
      if (project.imageUrl) {
        setImagePreview(project.imageUrl)
      } else {
        setImagePreview(null)
      }
      setImageFile(null)
    } else {
      reset({
        name: '',
        city: '',
        modelIds: []
      })
      setImagePreview(null)
      setImageFile(null)
    }
  }, [project, reset])

  const handleChange = (e) => {
    const { name, value } = e.target
    const filteredValue = value
      .replace(/[^а-яА-ЯёЁa-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
    
    setValue(name, filteredValue, { shouldValidate: true })
  }

  const handleModelSelect = (modelId) => {
    const currentIds = watchedModelIds || []
    const newModelIds = currentIds.includes(modelId)
      ? currentIds.filter(id => id !== modelId)
      : [...currentIds, modelId]
    
    setValue('modelIds', newModelIds, { shouldValidate: true })
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    setImageError('')
    
    if (file) {
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
      if (!validMimeTypes.includes(file.type?.toLowerCase())) {
        setImageError('Разрешены только изображения: JPG, PNG, GIF, WEBP, BMP')
        return
      }
      
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview(null)
    setImageError('')
  }

  const onSubmitForm = async (data) => {
    try {
      await onSubmit({ 
        ...data, 
        imageFile, 
        deleteImage: !imageFile && !imagePreview 
      })
    } catch (error) {
      // Проверяем, является ли это ошибкой дубликата проекта
      const formattedError = await handleError(error, { context: 'ProjectForm.onSubmitForm' })
      const errorMessage = getErrorMessage(formattedError)
      
      // Если ошибка связана с дубликатом названия проекта, устанавливаем её в поле name
      if ((error instanceof ApiError && error.status === 400) || error?.status === 400) {
        if (
          errorMessage.includes('Проект с таким названием уже существует') ||
          errorMessage.includes('проект с таким названием') ||
          errorMessage.toLowerCase().includes('уже существует')
        ) {
          setError('name', {
            type: 'manual',
            message: 'Проект с таким названием уже существует'
          })
        }
      }
      
      // Пробрасываем ошибку дальше, чтобы показать оповещение
      throw error
    }
  }

  // Сортировка сфер: по количеству моделей, "Другое" в конце
  const sortedSpheres = [...spheres].sort((a, b) => {
    const aCount = models.filter(model => model.spheres?.some(s => s.id === a.id)).length
    const bCount = models.filter(model => model.spheres?.some(s => s.id === b.id)).length
    
    if (a.name === 'Другое') return 1
    if (b.name === 'Другое') return -1
    
    return bCount - aCount
  })

  const filteredModels = models
    .filter(model => {
      if (activeTab === 'all') return true
      if (activeTab === 'no-sphere') {
        return !model.spheres || model.spheres.length === 0
      }
      return model.spheres?.some(s => s.id === activeTab)
    })
    .filter(model =>
      model.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

  // Пагинация
  const { currentPage, totalPages, paginatedItems: paginatedModels, setCurrentPage } = usePagination(
    filteredModels,
    modelsPerPage,
    [activeTab, searchTerm]
  )

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
        onMouseDown={modalHandlers.handleOverlayMouseDown}
        onClick={modalHandlers.handleOverlayClick}
      >
        <div 
          className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          onMouseDown={modalHandlers.handleContentMouseDown}
          onClick={modalHandlers.handleContentClick}
        >
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                {project ? 'Редактировать проект' : 'Создать новый проект'}
              </h2>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleFormSubmit(onSubmitForm)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            {/* Поля проекта */}
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название проекта <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                  placeholder="Введите название проекта"
                  maxLength={150}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Город
                </label>
                <input
                  type="text"
                  {...register('city')}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                  placeholder="Введите город"
                  maxLength={50}
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Изображение проекта
                </label>
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview.startsWith('blob:') ? imagePreview : proxyUrl(imagePreview)} 
                      alt="Превью изображения проекта" 
                      className="w-full h-48 object-cover rounded-md border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer"
                      disabled={isSubmitting}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="project-image-upload"
                    className="block border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp"
                      onChange={handleImageChange}
                      className="hidden"
                      id="project-image-upload"
                      disabled={isSubmitting}
                    />
                    <div className="text-sm text-gray-600 hover:text-blue-600">
                      <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Нажмите для загрузки изображения</span>
                    </div>
                  </label>
                )}
                {imageError && (
                  <p className="mt-1 text-sm text-red-600">{imageError}</p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className={`mb-4 ${project && currentUser && (currentUser.role === 'ADMIN' || checkPermission(currentUser, ALL_PERMISSIONS.UPLOAD_MODELS)) ? 'flex items-center gap-3' : ''}`}>
                <input
                  type="text"
                  placeholder="Поиск моделей..."
                  className={`${project && currentUser && (currentUser.role === 'ADMIN' || checkPermission(currentUser, ALL_PERMISSIONS.UPLOAD_MODELS)) ? 'flex-1' : 'w-full'} px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  maxLength={50}
                />
                {project && currentUser && (currentUser.role === 'ADMIN' || checkPermission(currentUser, ALL_PERMISSIONS.UPLOAD_MODELS)) && (
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/models/upload?projectId=${project.id}`)}
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
              {spheres.length > 0 && (
                <div className="mb-4">
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
                    <button
                      onClick={() => setActiveTab('no-sphere')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                        activeTab === 'no-sphere'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Без сферы
                      <span className={`ml-1.5 text-xs ${activeTab === 'no-sphere' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {models.filter(m => !m.spheres || m.spheres.length === 0).length}
                      </span>
                    </button>
                    <div className="h-6 w-px bg-gray-300"></div>
                    {sortedSpheres.map((sphere) => {
                      const sphereModelsCount = models.filter(model =>
                        model.spheres?.some(s => s.id === sphere.id)
                      ).length
                      
                      if (sphereModelsCount === 0) return null
                      
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
              )}

              {isLoadingModels ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div>
                  {filteredModels.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">Модели не найдены</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        {paginatedModels.map(model => (
                        <div 
                          key={model.id} 
                          className={`relative bg-white border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                            watchedModelIds?.includes(model.id) 
                              ? 'border-blue-500 shadow-md' 
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          } cursor-pointer`}
                          onClick={() => handleModelSelect(model.id)}
                        >
                          {/* Галочка в углу */}
                          <div className="absolute top-2 right-2 z-10">
                            <input
                              type="checkbox"
                              id={`project-model-${model.id}`}
                              checked={watchedModelIds?.includes(model.id)}
                              onChange={() => handleModelSelect(model.id)}
                              className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          {/* Превью изображения */}
                          <div className="relative aspect-square bg-gray-100 overflow-hidden">
                            {model.images && model.images.length > 0 ? (
                              <img
                                src={proxyUrl(model.images[0])}
                                alt={model.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3EНет изображения%3C/text%3E%3C/svg%3E'
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Информация о модели */}
                          <div className="p-3">
                            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                              {model.title}
                            </h3>
                            {model.author?.name && (
                              <p className="text-xs text-gray-500 truncate">
                                {model.author.name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      </div>

                      {/* Пагинация */}
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-4">
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
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {errors.root && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{errors.root.message}</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Сохранение...
                </span>
              ) : project ? 'Сохранить изменения' : 'Создать проект'}
            </button>
          </div>
          </form>
        </div>
      </div>
    </>
  )
}
