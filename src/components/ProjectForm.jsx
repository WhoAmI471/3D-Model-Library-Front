'use client'
import { useEffect, useState } from 'react'

export default function ProjectForm({ project, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
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