'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ModelPreview } from "@/components/ModelPreview"
import { proxyUrl } from '@/lib/utils'


export default function ProjectForm({ project, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    modelIds: []
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [models, setModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  
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
      setFormData({
        name: '',
        city: '',
        modelIds: []
      })
      setImagePreview(null)
      setImageFile(null)
    }
  }, [project])

  const handleChange = (e) => {
    const { name, value } = e.target
    const filteredValue = value
      .replace(/[^а-яА-ЯёЁa-zA-Z0-9\s]/g, '') // Удаляем недопустимые символы
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
      .trim()
      
    setFormData(prev => ({
      ...prev,
      [name]: filteredValue
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
      // Позиционируем превью слева от элемента, но не выходим за границы экрана
      const previewWidth = 320
      const previewHeight = 240
      const x = rect.left - previewWidth - 20 // Позиция слева от элемента
      const y = Math.min(rect.top, window.innerHeight - previewHeight - 20)
      setPreviewPosition({
        x: Math.max(20, x), // Минимум 20px от левого края
        y: Math.max(20, y)  // Минимум 20px от верхнего края
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

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Проверка типа файла
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
      if (!validMimeTypes.includes(file.type?.toLowerCase())) {
        setErrors(prev => ({ ...prev, image: 'Разрешены только изображения: JPG, PNG, GIF, WEBP, BMP' }))
        return
      }
      
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      if (errors.image) {
        setErrors(prev => ({ ...prev, image: '' }))
      }
    }
  }

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview)
    }
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    setIsSubmitting(true)
    try {
      await onSubmit({ ...formData, imageFile, deleteImage: !imageFile && !imagePreview })
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
    <div className="mb-6 p-6 rounded-lg bg-white shadow-sm w-full max-w-2xl" onMouseLeave={handleMouseLeave}>
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
          <div onMouseLeave={handleMouseLeave}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Город
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.city ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
              placeholder="Введите город"
              maxLength={50}
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city}</p>
            )}
          </div>
          <div onMouseLeave={handleMouseLeave}>
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
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  disabled={isSubmitting}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp"
                  onChange={handleImageChange}
                  className="hidden"
                  id="project-image-upload"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="project-image-upload"
                  className="cursor-pointer text-sm text-gray-600 hover:text-blue-600"
                >
                  <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Нажмите для загрузки изображения</span>
                </label>
              </div>
            )}
            {errors.image && (
              <p className="mt-1 text-sm text-red-600">{errors.image}</p>
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Модели в проекте
              </label>
              <button
                type="button"
                onClick={() => router.push('/dashboard/models/upload')}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Добавить новую модель
              </button>
            </div>
            {isLoadingModels ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-md p-3 bg-gray-50 min-h-[240px]">
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
                            : 'border border-transparent hover:bg-gray-100'
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
      </form>
      
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