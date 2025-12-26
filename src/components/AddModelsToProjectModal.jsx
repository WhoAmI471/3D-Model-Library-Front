'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkPermission } from '@/lib/permission'
import { ALL_PERMISSIONS } from '@/lib/roles'
import { proxyUrl } from '@/lib/utils'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useModelsData } from '@/hooks/useModelsData'
import { useModal } from '@/hooks/useModal'
import { usePagination } from '@/hooks/usePagination'

export default function AddModelsToProjectModal({ projectId, onClose, onAdd, existingModelIds = [] }) {
  const router = useRouter()
  const { models, spheres, currentUser, isLoading: isLoadingModels } = useModelsData()
  const [selectedModels, setSelectedModels] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const modelsPerPage = 12

  const modalHandlers = useModal(onClose)

  const handleModelSelect = (modelId) => {
    setSelectedModels(prev => 
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }

  const handleSubmit = () => {
    if (selectedModels.length > 0) {
      onAdd(selectedModels)
    }
  }


  // Фильтруем модели: исключаем те, что уже есть в проекте
  const availableModels = models.filter(model => 
    !existingModelIds.includes(model.id)
  )

  // Сортировка сфер: по количеству моделей, "Другое" в конце
  const sortedSpheres = [...spheres].sort((a, b) => {
    const aCount = availableModels.filter(model => model.sphere?.id === a.id).length
    const bCount = availableModels.filter(model => model.sphere?.id === b.id).length
    
    // Если одна из сфер называется "Другое", она идет в конец
    if (a.name === 'Другое') return 1
    if (b.name === 'Другое') return -1
    
    // Остальные сортируем по количеству моделей (от большего к меньшему)
    return bCount - aCount
  })
  
  const filteredModels = availableModels
    .filter(model => {
      // Фильтрация по вкладке сферы
      if (activeTab === 'all') return true
      return model.sphere?.id === activeTab
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
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Добавить модели в проект
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4 flex items-center gap-3">
            <input
              type="text"
              placeholder="Поиск моделей..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              maxLength={50}
            />
            {currentUser && (currentUser.role === 'ADMIN' || checkPermission(currentUser, ALL_PERMISSIONS.UPLOAD_MODELS)) && (
              <button
                type="button"
                onClick={() => router.push(`/dashboard/models/upload?projectId=${projectId}`)}
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
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Все модели
                  <span className={`ml-1.5 text-xs ${activeTab === 'all' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {availableModels.length}
                  </span>
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                {sortedSpheres.map((sphere) => {
                  const sphereModelsCount = availableModels.filter(model =>
                    model.sphere?.id === sphere.id
                  ).length
                  
                  if (sphereModelsCount === 0) return null // Не показываем сферы без доступных моделей
                  
                  return (
                    <button
                      key={sphere.id}
                      onClick={() => setActiveTab(sphere.id)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
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
                        selectedModels.includes(model.id) 
                          ? 'border-blue-500 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => handleModelSelect(model.id)}
                    >
                      {/* Галочка в углу */}
                      <div className="absolute top-2 right-2 z-10">
                        <input
                          type="checkbox"
                          id={`modal-model-${model.id}`}
                          checked={selectedModels.includes(model.id)}
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
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        Назад
                      </button>
                      <div className="flex items-center px-4 text-sm text-gray-600">
                        Страница {currentPage} из {totalPages}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
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

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedModels.length === 0}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              selectedModels.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Добавить ({selectedModels.length})
          </button>
        </div>
      </div>
    </div>
  )
}

