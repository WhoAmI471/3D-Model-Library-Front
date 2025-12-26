'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ModelPreview } from "@/components/ModelPreview"
import { checkPermission } from '@/lib/permission'
import { ALL_PERMISSIONS } from '@/lib/roles'

export default function AddModelsToProjectModal({ projectId, onClose, onAdd, existingModelIds = [] }) {
  const router = useRouter()
  const [models, setModels] = useState([])
  const [spheres, setSpheres] = useState([])
  const [selectedModels, setSelectedModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [currentUser, setCurrentUser] = useState(null)
  
  const [previewModel, setPreviewModel] = useState(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [showPreview, setShowPreview] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [autoPlayInterval, setAutoPlayInterval] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingModels(true)
      try {
        const [modelsRes, spheresRes, userRes] = await Promise.all([
          fetch('/api/models'),
          fetch('/api/spheres'),
          fetch('/api/auth/me')
        ])
        const modelsData = await modelsRes.json()
        const spheresData = await spheresRes.json()
        const userData = await userRes.json()
        setModels(modelsData)
        setSpheres(spheresData)
        setCurrentUser(userData.user || null)
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
      } finally {
        setIsLoadingModels(false)
      }
    }

    fetchData()
  }, [])

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

  const handleMouseMove = (event) => {
    if (isHovering) {
      updatePreviewPosition(event)
    }
  }

  const updatePreviewPosition = (event) => {
    const x = Math.min(event.clientX + 20, window.innerWidth - 340)
    const y = Math.min(event.clientY + 20, window.innerHeight - 260)
    setPreviewPosition({ x, y })
  }

  const nextImage = () => {
    if (previewModel?.images?.length) {
      setCurrentImageIndex(prev => 
        prev === previewModel.images.length - 1 ? 0 : prev + 1
      )
    }
  }

  const prevImage = () => {
    if (previewModel?.images?.length) {
      setCurrentImageIndex(prev => 
        prev === 0 ? previewModel.images.length - 1 : prev - 1
      )
    }
  }

  const startAutoPlay = () => {
    if (!previewModel || !previewModel.images?.length) return
    
    stopAutoPlay()
    
    const interval = setInterval(() => {
      if (!previewModel || !previewModel.images?.length) {
        stopAutoPlay()
        return
      }
      nextImage()
    }, 2000)
    
    setAutoPlayInterval(interval)
  }

  const stopAutoPlay = () => {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval)
      setAutoPlayInterval(null)
    }
  }

  const handleWheel = (e) => {
    if (!previewModel || !previewModel.images?.length) return
    
    e.preventDefault()
    if (e.deltaY > 0) {
      nextImage()
    } else {
      prevImage()
    }
  }

  const handleMouseEnter = (model, event) => {
    if (model?.images?.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect()
      const previewWidth = 320
      const previewHeight = 240
      const x = rect.left - previewWidth - 20
      const y = Math.min(rect.top, window.innerHeight - previewHeight - 20)
      setPreviewPosition({
        x: Math.max(20, x),
        y: Math.max(20, y)
      })
      setPreviewModel(model)
      setCurrentImageIndex(0)
      setShowPreview(true)
      startAutoPlay()
    }
  }
  
  const handleMouseLeave = () => {
    setShowPreview(false)
    setPreviewModel(null)
    stopAutoPlay()
  }

  useEffect(() => {
    return () => {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval)
      }
    }
  }, [autoPlayInterval])

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

  const [mouseDownTarget, setMouseDownTarget] = useState(null)

  const handleOverlayMouseDown = (e) => {
    setMouseDownTarget(e.target)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
      onClose()
    }
    setMouseDownTarget(null)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Добавить модели в проект
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Поиск моделей..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              maxLength={50}
            />
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

          {currentUser && (currentUser.role === 'ADMIN' || checkPermission(currentUser, ALL_PERMISSIONS.UPLOAD_MODELS)) && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/models/upload?projectId=${projectId}`)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Добавить новую модель
              </button>
            </div>
          )}

          {isLoadingModels ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-md p-3 bg-gray-50 min-h-[240px]">
              {filteredModels.length === 0 ? (
                <p className="text-gray-500 text-sm">Модели не найдены</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredModels.map(model => (
                    <div 
                      key={model.id} 
                      className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                        selectedModels.includes(model.id) 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'border border-transparent hover:bg-gray-100'
                      }`}
                      onClick={() => handleModelSelect(model.id)}
                      onMouseEnter={(e) => handleMouseEnter(model, e)}
                    >
                      <input
                        type="checkbox"
                        id={`modal-model-${model.id}`}
                        checked={selectedModels.includes(model.id)}
                        onChange={() => handleModelSelect(model.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label 
                        htmlFor={`modal-model-${model.id}`} 
                        className="ml-3 block text-sm text-gray-700 cursor-pointer flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="font-medium">{model.title}</span>
                        {model.author?.name && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({model.author.name})
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
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

      <AnimatePresence>
        {showPreview && previewModel && (
          <ModelPreview
            model={previewModel}
            position={previewPosition}
            currentImageIndex={currentImageIndex}
            onNextImage={nextImage}
            onPrevImage={prevImage}
            onWheel={handleWheel}
            isHovering={isHovering}
            setIsHovering={setShowPreview}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

