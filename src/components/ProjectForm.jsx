'use client'
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ModelPreview } from "@/components/ModelPreview"


export default function ProjectForm({ project, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    modelIds: []
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [models, setModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  
  const [previewModel, setPreviewModel] = useState(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [showPreview, setShowPreview] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [autoPlayInterval, setAutoPlayInterval] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true)
      try {
        const response = await fetch('/api/models')
        const data = await response.json()
        setModels(data)
      } catch (error) {
        console.error('Ошибка загрузки моделей:', error)
      } finally {
        setIsLoadingModels(false)
      }
    }

    fetchModels()
  }, [])

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        modelIds: project.models?.map(model => model.id) || []
      })
    }
  }, [project])

  const handleChange = (e) => {
    const { name, value } = e.target
    value
      .replace(/[^а-яА-ЯёЁa-zA-Z0-9\s]/g, '') // Удаляем недопустимые символы
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
      .trim()
      
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleModelSelect = (modelId) => {
    setFormData(prev => {
      const newModelIds = prev.modelIds.includes(modelId)
        ? prev.modelIds.filter(id => id !== modelId)
        : [...prev.modelIds, modelId]
      
      return {
        ...prev,
        modelIds: newModelIds
      }
    })
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) newErrors.name = 'Введите название проекта'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
    if (!previewModel || !previewModel.images?.length) return
    
    setCurrentImageIndex(prev => 
      prev === previewModel.images.length - 1 ? 0 : prev + 1
    )
  }

  const prevImage = () => {
    if (!previewModel || !previewModel.images?.length) return
    
    setCurrentImageIndex(prev => 
      prev === 0 ? previewModel.images.length - 1 : prev - 1
    )
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
      setPreviewPosition({
        x: rect.right + 1000, // Позиция справа от строки
        y: rect.top - 100
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      setErrors({
        form: error.message || 'Произошла ошибка при сохранении'
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  const filteredModels = models.filter(model =>
    model.title.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="mb-6 p-6 rounded-lg bg-white shadow-sm" onMouseLeave={handleMouseLeave}>
      <h2 className="text-xl font-semibold mb-6 text-gray-800">
        {project ? 'Редактировать проект' : 'Создать новый проект'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6" onMouseLeave={handleMouseLeave}>
        <div className="space-y-4">
          <div onMouseLeave={handleMouseLeave}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название проекта <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
              placeholder="Введите название проекта"
              maxLength={50}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>
          <input
            type="text"
            placeholder="Поиск моделей..."
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            maxLength={50}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Модели в проекте
            </label>
            {isLoadingModels ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                {models.length === 0 ? (
                  <p className="text-gray-500 text-sm">Нет доступных моделей</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredModels.map(model => (
                      <div 
                        key={model.id} 
                        className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${
                          formData.modelIds.includes(model.id) 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleModelSelect(model.id)}
                        onMouseEnter={(e) => handleMouseEnter(model, e)}
                      >
                        <input
                          type="checkbox"
                          id={`model-${model.id}`}
                          checked={formData.modelIds.includes(model.id)}
                          onChange={() => handleModelSelect(model.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          disabled={isSubmitting}
                          onClick={() => handleModelSelect(model.id)}
                        />
                        <label 
                          htmlFor={`model-${model.id}`} 
                          className="ml-3 block text-sm text-gray-700 cursor-pointer"
                          onClick={() => handleModelSelect(model.id)}
                        >
                          <span className="font-medium">{model.title}</span>
                          {model.author?.name && (
                            <span className="text-xs text-gray-500 ml-2">
                              (проекты: {model.projects?.length > 0 ? model.projects.map(p => p.name).join(', ') : '—'})
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
        </div>
        
        {errors.form && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-sm text-red-700">{errors.form}</p>
          </div>
        )}
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSubmitting}
            onMouseLeave={handleMouseLeave}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting}
            onMouseLeave={handleMouseLeave}
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
      </form>
    </div>
  )
}