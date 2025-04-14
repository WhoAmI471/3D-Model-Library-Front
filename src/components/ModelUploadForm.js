'use client'
import { useState } from 'react'
import ModelList from './ModelList'

export default function ModelUploadForm() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    projectId: '',
    authorId: '',
    sphere: '',
    zipFile: null,
    screenshots: []
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormState(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const { name, files } = e.target
    if (name === 'screenshots') {
      setFormState(prev => ({ ...prev, screenshots: files }))
    } else {
      setFormState(prev => ({ ...prev, zipFile: files[0] }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append('title', formState.title)
    formData.append('description', formState.description)
    formData.append('projectId', formState.projectId)
    formData.append('authorId', formState.authorId)
    formData.append('sphere', formState.sphere)
    formData.append('zipFile', formState.zipFile)
    for (const screenshot of formState.screenshots) {
      formData.append('screenshots', screenshot)
    }

    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    const res = await fetch('/api/models/upload', {
      method: 'POST',
      body: formData
    })

    const result = await res.json()
    if (result.success) {
      setModels(result.allModels)
      alert('Модель загружена успешно!')
    } else {
      alert('Ошибка при загрузке модели')
    }
    setLoading(false)
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded mb-8">
        <input name="title" placeholder="Название" value={formState.title} onChange={handleChange} className="block w-full border px-2 py-1" />
        <textarea name="description" placeholder="Описание" value={formState.description} onChange={handleChange} className="block w-full border px-2 py-1" />
        <input name="authorId" placeholder="Автор (ID)" value={formState.authorId} onChange={handleChange} className="block w-full border px-2 py-1" />
        <input name="projectId" placeholder="Проект (ID)" value={formState.projectId} onChange={handleChange} className="block w-full border px-2 py-1" />
        <select name="sphere" value={formState.sphere} onChange={handleChange} required>
          <option value="CONSTRUCTION">Строительство</option>
          <option value="CHEMISTRY">Химия</option>
          <option value="INDUSTRIAL">Промышленность</option>
          <option value="MEDICAL">Медицина</option>
          <option value="OTHER">Другое</option>
        </select>

        <label className="block">ZIP-файл модели</label>
        <input name="zipFile" type="file" onChange={handleFileChange} accept=".zip" className="block" />

        <label className="block">Скриншоты</label>
        <input name="screenshots" type="file" onChange={handleFileChange} accept="image/*" multiple className="block" />

        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? 'Загрузка...' : 'Загрузить модель'}
        </button>
      </form>

      {models.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Загруженные модели</h2>
          <ModelList models={models} />
        </div>
      )}
    </div>
  )
}
