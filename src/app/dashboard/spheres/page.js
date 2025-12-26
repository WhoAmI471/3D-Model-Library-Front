'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { checkPermission } from '@/lib/permission'
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

export default function SpheresPage() {
  const [spheres, setSpheres] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [sphereName, setSphereName] = useState('')
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')

  // Загрузка сфер
  useEffect(() => {
    const fetchSpheres = async () => {
      try {
        const response = await fetch('/api/spheres')
        const data = await response.json()
        setSpheres(data)
        const userResponse = await fetch('/api/auth/me')
        const userData = await userResponse.json()
        setUser(userData.user || null)
      } catch (error) {
        console.error('Ошибка загрузки сфер:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSpheres()
  }, [])

  // Поиск и сортировка сфер
  const filteredSpheres = spheres.filter(sphere =>
    sphere.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // Сфера "Другое" всегда в конце
    if (a.name === 'Другое') return 1
    if (b.name === 'Другое') return -1
    
    // Сортируем по количеству моделей (от большего к меньшему)
    const countA = a.modelsCount || 0
    const countB = b.modelsCount || 0
    
    if (countA !== countB) {
      return countB - countA
    }
    
    // Если количество моделей одинаковое, сортируем по алфавиту
    return a.name.localeCompare(b.name)
  })

  // Обработка добавления сферы
  const handleSphereSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!sphereName.trim()) {
      setError('Название сферы обязательно')
      return
    }

    try {
      const response = await fetch('/api/spheres', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sphereName.trim()
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSpheres([...spheres, { ...data, modelsCount: 0 }])
        setSphereName('')
        setShowAddForm(false)
        setError('')
      } else {
        setError(data.error || 'Ошибка создания сферы')
      }
    } catch (error) {
      console.error('Ошибка создания сферы:', error)
      setError('Ошибка создания сферы')
    }
  }

  const handleAdd = () => {
    setShowAddForm(true)
    setSphereName('')
    setError('')
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setSphereName('')
    setError('')
  }

  // Обработка удаления сферы
  const handleDelete = async (sphere, e) => {
    e.stopPropagation()
    
    if (sphere.modelsCount > 0) {
      alert(`Невозможно удалить сферу "${sphere.name}". К ней привязано ${sphere.modelsCount} моделей. Сначала измените сферу у всех связанных моделей.`)
      return
    }

    if (!confirm(`Вы уверены, что хотите удалить сферу "${sphere.name}"?`)) return
    
    const id = sphere.id

    try {
      const response = await fetch(`/api/spheres/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await response.json()

      if (response.ok) {
        setSpheres(spheres.filter(s => s.id !== id))
      } else {
        alert(data.error || 'Ошибка удаления сферы')
      }
    } catch (error) {
      console.error('Ошибка удаления сферы:', error)
      alert('Ошибка удаления сферы')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Загрузка...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-8">Сферы</h1>
        <div className="mb-8">
          {/* Поиск и кнопка добавления */}
          <div className="mb-6 flex gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {(user?.role === 'ADMIN') && (
              <button 
                onClick={handleAdd}
                className="group relative inline-flex items-center h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium cursor-pointer overflow-hidden"
                style={{ 
                  width: '2.5rem', 
                  paddingLeft: '0.625rem', 
                  paddingRight: '0.625rem',
                  transition: 'width 0.2s, padding-right 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.setProperty('width', '180px', 'important')
                  e.currentTarget.style.setProperty('padding-right', '2rem', 'important')
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.setProperty('width', '2.5rem', 'important')
                  e.currentTarget.style.setProperty('padding-right', '0.625rem', 'important')
                }}
                title="Добавить сферу"
              >
                <PlusIcon className="h-5 w-5 flex-shrink-0" style={{ color: '#ffffff', strokeWidth: 2 }} />
                <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Добавить сферу
                </span>
              </button>
            )}
          </div>

          {/* Форма добавления сферы */}
          {showAddForm && (
            <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Добавить новую сферу</h3>
              <form onSubmit={handleSphereSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название сферы
                  </label>
                  <input
                    type="text"
                    value={sphereName}
                    onChange={(e) => setSphereName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Введите название сферы"
                    autoFocus
                  />
                  {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Таблица сфер */}
        {filteredSpheres.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              {searchTerm
                ? 'Сферы не найдены'
                : 'Нет сфер'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Очистить поиск
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Количество моделей
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата создания
                  </th>
                  {user?.role === 'ADMIN' && (
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSpheres.map((sphere) => (
                  <tr key={sphere.id} className="hover:bg-gray-50 bg-white">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sphere.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sphere.modelsCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(sphere.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </td>
                    {user?.role === 'ADMIN' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => handleDelete(sphere, e)}
                          className="text-red-600 hover:text-red-900"
                          title="Удалить сферу"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

