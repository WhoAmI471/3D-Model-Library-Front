'use client'
import { useEffect, useState } from 'react'

export default function ProjectForm({ project, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    modelIds: []
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [models, setModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

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

  return (
    <div className="mb-6 p-4 border rounded bg-gray-50">
      <h2 className="text-xl font-semibold mb-4">
        {project ? 'Редактировать проект' : 'Создать новый проект'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 mb-4">
          <div>
            <label className="block mb-1">Название проекта *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`border p-2 rounded w-full ${errors.name ? 'border-red-500' : ''}`}
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block mb-1">Модели в проекте</label>
            {isLoadingModels ? (
              <p>Загрузка моделей...</p>
            ) : (
              <div className="border rounded p-2 max-h-60 overflow-y-auto">
                {models.length === 0 ? (
                  <p className="text-gray-500">Нет доступных моделей</p>
                ) : (
                  models.map(model => (
                    <div key={model.id} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`model-${model.id}`}
                        checked={formData.modelIds.includes(model.id)}
                        onChange={() => handleModelSelect(model.id)}
                        className="mr-2"
                        disabled={isSubmitting}
                      />
                      <label htmlFor={`model-${model.id}`} className="cursor-pointer">
                        {model.title}
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        
        {errors.form && (
          <p className="text-red-500 text-sm mb-4">{errors.form}</p>
        )}
        
        <div className="flex gap-2">
          <button
            type="submit"
            className={`bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Сохранение...' : project ? 'Обновить' : 'Создать'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
            disabled={isSubmitting}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}