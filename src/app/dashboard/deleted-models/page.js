'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/Loading'
import ConfirmDeleteAllModal from '@/components/ConfirmDeleteAllModal'
import ConfirmModal from '@/components/ConfirmModal'
import { proxyUrl, formatDateTime } from '@/lib/utils'
import apiClient from '@/lib/apiClient'
import { useNotification } from '@/hooks/useNotification'
import { useConfirm } from '@/hooks/useConfirm'
import { getErrorMessage, handleError } from '@/lib/errorHandler'
import { TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function DeletedModelsPage() {
  const router = useRouter()
  const [allDeletedModels, setAllDeletedModels] = useState([])
  const [spheres, setSpheres] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [userRole, setUserRole] = useState(null)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  
  const { success, error: showError } = useNotification()
  const { isOpen, message, title, confirmText, cancelText, variant, showConfirm, handleConfirm, handleCancel } = useConfirm()

  const loadDeletedModels = async () => {
    setIsLoading(true)
    try {
      // Загружаем все удаленные модели (без пагинации для фильтрации на клиенте)
      let allModels = []
      let page = 1
      let hasMore = true
      
      while (hasMore) {
        const response = await fetch(`/api/deleted-models?page=${page}&limit=100`)
        if (!response.ok) throw new Error('Ошибка загрузки')
        const data = await response.json()
        allModels = [...allModels, ...(data.deletedModels || [])]
        hasMore = page < data.totalPages
        page++
      }
      
      setAllDeletedModels(allModels)
    } catch (error) {
      console.error('Ошибка загрузки удаленных моделей:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await apiClient.auth.me()
        setUserRole(userData.user?.role || null)
        
        const spheresData = await apiClient.spheres.getAll()
        setSpheres(spheresData)
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    loadDeletedModels()
  }, [])

  const handleDeleteAll = async () => {
    try {
      await apiClient.deletedModels.deleteAll()
      success('Все удаленные модели полностью удалены')
      setShowDeleteAllModal(false)
      setAllDeletedModels([])
    } catch (error) {
      const formattedError = await handleError(error, { context: 'DeletedModelsPage.handleDeleteAll' })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
    }
  }

  const handleDeleteSingle = async (modelId, event, modelTitle) => {
    event.stopPropagation()
    event.preventDefault()
    
    const confirmed = await showConfirm({
      message: `Вы уверены, что хотите полностью удалить модель "${modelTitle}"? Это действие нельзя отменить.`,
      variant: 'danger',
      confirmText: 'Удалить полностью'
    })
    
    if (!confirmed) return
    
    try {
      await apiClient.deletedModels.delete(modelId)
      success('Модель полностью удалена')
      loadDeletedModels()
    } catch (error) {
      const formattedError = await handleError(error, { context: 'DeletedModelsPage.handleDeleteSingle', modelId })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
    }
  }

  // Сортировка сфер: по количеству удаленных моделей, "Другое" в конце
  const sortedSpheres = [...spheres].sort((a, b) => {
    const aCount = allDeletedModels.filter(model => model.sphereNames?.includes(a.name)).length
    const bCount = allDeletedModels.filter(model => model.sphereNames?.includes(b.name)).length
    
    // Если одна из сфер называется "Другое", она идет в конец
    if (a.name === 'Другое') return 1
    if (b.name === 'Другое') return -1
    
    // Остальные сортируем по количеству моделей (от большего к меньшему)
    return bCount - aCount
  })

  // Фильтрация моделей
  const filteredModels = allDeletedModels
    .filter(model => {
      // Фильтрация по вкладке сферы
      if (activeTab === 'all') return true
      const selectedSphere = spheres.find(s => s.id === activeTab)
      return selectedSphere && model.sphereNames?.includes(selectedSphere.name)
    })
    .filter(model => {
      // Фильтрация по поиску
      if (!searchTerm) return true
      
      const searchLower = searchTerm.toLowerCase()
      return (
        model.title?.toLowerCase().includes(searchLower) ||
        (model.authorName?.toLowerCase().includes(searchLower)) ||
        (model.sphereNames?.some(name => name.toLowerCase().includes(searchLower))) ||
        (model.projectNames?.some(p => p.toLowerCase().includes(searchLower)))
      )
    })
    .sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">История удаленных моделей</h1>
        
        <div className="mb-8">
          {/* Поиск и кнопка удаления всех */}
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
            {userRole === 'ADMIN' && filteredModels.length > 0 && (
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="group relative inline-flex items-center h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium cursor-pointer overflow-hidden"
                style={{ 
                  width: '2.5rem', 
                  paddingLeft: '0.625rem', 
                  paddingRight: '0.625rem',
                  transition: 'width 0.2s, padding-right 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.setProperty('width', '240px', 'important')
                  e.currentTarget.style.setProperty('padding-right', '2rem', 'important')
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.setProperty('width', '2.5rem', 'important')
                  e.currentTarget.style.setProperty('padding-right', '0.625rem', 'important')
                }}
                title="Удалить все полностью"
              >
                <TrashIcon className="h-5 w-5 flex-shrink-0" style={{ color: '#ffffff', strokeWidth: 2 }} />
                <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Удалить все полностью
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
                  {allDeletedModels.length}
                </span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              {sortedSpheres.map((sphere) => {
                const sphereModelsCount = allDeletedModels.filter(model =>
                  model.sphereNames?.includes(sphere.name)
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
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loading />
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              {searchTerm || activeTab !== 'all'
                ? 'Удаленные модели не найдены'
                : 'Удаленные модели не найдены'}
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
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-gray-300 flex flex-col"
                >
                  {/* Превью изображения */}
                  <Link
                    href={`/dashboard/deleted-models/${model.id}`}
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
                    <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded shadow-lg">
                      Удалена
                    </div>
                  </Link>

                  {/* Контент карточки */}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex-1">
                      <Link href={`/dashboard/deleted-models/${model.id}`}>
                        <h3 className="font-semibold text-gray-900 mb-2 cursor-pointer hover:text-blue-600 transition-colors" title={model.title}>
                          {model.title && model.title.length > 25 ? `${model.title.substring(0, 25)}...` : model.title}
                        </h3>
                      </Link>
                      
                      <div className="space-y-2">
                        {model.authorName && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="truncate">{model.authorName}</span>
                          </div>
                        )}
                        {model.projectNames && model.projectNames.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {model.projectNames.slice(0, 2).map((projectName, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                              >
                                {projectName}
                              </span>
                            ))}
                            {model.projectNames.length > 2 && (
                              <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                                +{model.projectNames.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Дата удаления и кнопка удаления */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-4">
                      <div>
                        <div className="text-xs text-gray-500">
                          Удалена: {formatDateTime(model.deletedAt)}
                        </div>
                        {model.user && (
                          <div className="text-xs text-gray-500 mt-1">
                            Удалил: {model.user.name}
                          </div>
                        )}
                      </div>
                      {userRole === 'ADMIN' && (
                        <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                          <button
                            onClick={(e) => handleDeleteSingle(model.id, e, model.title)}
                            className="p-1.5 rounded transition-colors text-gray-600 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Удалить полностью"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      <ConfirmDeleteAllModal
        isOpen={showDeleteAllModal}
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteAllModal(false)}
        count={filteredModels.length}
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
