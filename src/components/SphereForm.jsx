'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { proxyUrl } from '@/lib/utils'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useModelsData } from '@/hooks/useModelsData'
import { useModal } from '@/hooks/useModal'
import { usePagination } from '@/hooks/usePagination'
import { sphereSchema } from '@/lib/validations/sphereSchema'
import { handleError, getErrorMessage } from '@/lib/errorHandler'
import { ApiError } from '@/lib/apiClient'

export default function SphereForm({ sphere, onSubmit, onCancel }) {
  const { models, spheres: allSpheres, isLoading: isLoadingModels } = useModelsData()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
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
    resolver: zodResolver(sphereSchema),
    defaultValues: {
      name: '',
      modelIds: []
    }
  })

  const watchedModelIds = watch('modelIds')

  useEffect(() => {
    if (sphere) {
      reset({
        name: sphere.name,
        modelIds: sphere.models?.map(model => model.id) || []
      })
    } else {
      reset({
        name: '',
        modelIds: []
      })
    }
  }, [sphere, reset])

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

  const onSubmitForm = async (data) => {
    try {
      await onSubmit(data)
    } catch (error) {
      const formattedError = await handleError(error, { context: 'SphereForm.onSubmitForm' })
      const errorMessage = getErrorMessage(formattedError)
      
      if ((error instanceof ApiError && error.status === 400) || error?.status === 400) {
        if (
          errorMessage.includes('Сфера с таким названием уже существует') ||
          errorMessage.includes('сфера с таким названием') ||
          errorMessage.toLowerCase().includes('уже существует')
        ) {
          setError('name', {
            type: 'manual',
            message: 'Сфера с таким названием уже существует'
          })
        }
      }
      
      throw error
    }
  }

  // Сортировка сфер: по количеству моделей, "Другое" в конце
  const sortedSpheres = [...allSpheres].sort((a, b) => {
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
                {sphere ? 'Редактировать сферу' : 'Создать новую сферу'}
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
              {/* Поля сферы */}
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название сферы <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    onChange={handleChange}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isSubmitting}
                    placeholder="Введите название сферы"
                    maxLength={50}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
              </div>

              {/* Каталог моделей */}
              <div className="border-t border-gray-200 pt-6">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Поиск моделей..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    maxLength={50}
                  />
                </div>

                {/* Вкладки сфер */}
                {allSpheres.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-200">
                      <button
                        type="button"
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
                        type="button"
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
                      {sortedSpheres.map((s) => {
                        const sphereModelsCount = models.filter(model =>
                          model.spheres?.some(sp => sp.id === s.id)
                        ).length
                        
                        if (sphereModelsCount === 0) return null
                        
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setActiveTab(s.id)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                              activeTab === s.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {s.name}
                            <span className={`ml-1.5 text-xs ${activeTab === s.id ? 'text-blue-100' : 'text-gray-500'}`}>
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
                                  id={`sphere-model-${model.id}`}
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
                              type="button"
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
                              type="button"
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
                ) : sphere ? 'Сохранить изменения' : 'Создать сферу'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
