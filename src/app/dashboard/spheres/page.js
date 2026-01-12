'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { checkPermission } from '@/lib/permission'
import { ALL_PERMISSIONS } from '@/lib/roles'
import apiClient from '@/lib/apiClient'
import Loading from '@/components/Loading'
import { getErrorMessage, handleError } from '@/lib/errorHandler'
import { useNotification } from '@/hooks/useNotification'
import { useConfirm } from '@/hooks/useConfirm'
import ConfirmModal from '@/components/ConfirmModal'
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function SpheresPage() {
  const [spheres, setSpheres] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [sphereName, setSphereName] = useState('')
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [editingSphere, setEditingSphere] = useState(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')
  const { success, error: showError } = useNotification()
  const { isOpen, message, title, confirmText, cancelText, variant, showConfirm, handleConfirm, handleCancel: handleConfirmCancel } = useConfirm()

  // Загрузка сфер
  useEffect(() => {
    const fetchSpheres = async () => {
      try {
        const spheresData = await apiClient.spheres.getAll()
        setSpheres(spheresData)
        const userData = await apiClient.auth.me()
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
      const data = await apiClient.spheres.create({ name: sphereName.trim() })
      setSpheres([...spheres, { ...data, modelsCount: 0 }])
      setSphereName('')
      setShowAddForm(false)
      setError('')
      success('Сфера успешно создана')
    } catch (error) {
      const formattedError = await handleError(error, { context: 'SpheresPage.handleSphereSubmit' })
      const errorMessage = getErrorMessage(formattedError)
      setError(errorMessage)
      showError(errorMessage)
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

  // Обработка начала редактирования
  const handleEdit = (sphere, e) => {
    e.stopPropagation()
    setEditingSphere(sphere)
    setEditName(sphere.name)
    setEditError('')
  }

  // Обработка отмены редактирования
  const handleCancelEdit = () => {
    setEditingSphere(null)
    setEditName('')
    setEditError('')
  }

  // Обработка сохранения изменений
  const handleUpdate = async () => {
    if (!editingSphere) return

    if (!editName.trim()) {
      setEditError('Название сферы обязательно')
      return
    }

    if (editName.trim().length > 50) {
      setEditError('Название сферы не должно превышать 50 символов')
      return
    }

    try {
      const updatedSphere = await apiClient.spheres.update(editingSphere.id, { name: editName.trim() })
      setSpheres(spheres.map(s => s.id === editingSphere.id ? { ...updatedSphere, modelsCount: s.modelsCount } : s))
      setEditingSphere(null)
      setEditName('')
      setEditError('')
      success('Название сферы успешно изменено')
    } catch (error) {
      const formattedError = await handleError(error, { context: 'SpheresPage.handleUpdate', sphereId: editingSphere.id })
      const errorMessage = getErrorMessage(formattedError)
      setEditError(errorMessage)
      showError(errorMessage)
    }
  }

  // Обработка удаления сферы
  const handleDelete = async (sphere, e) => {
    e.stopPropagation()
    
    if (sphere.modelsCount > 0) {
      showError(`Невозможно удалить сферу "${sphere.name}". К ней привязано ${sphere.modelsCount} моделей. Сначала измените сферу у всех связанных моделей.`)
      return
    }

    const confirmed = await showConfirm({
      message: `Вы уверены, что хотите удалить сферу "${sphere.name}"?`,
      variant: 'danger',
      confirmText: 'Удалить'
    })
    
    if (!confirmed) return
    
    const id = sphere.id

    try {
      const data = await apiClient.spheres.delete(id)

      if (data) {
        setSpheres(spheres.filter(s => s.id !== id))
        success('Сфера успешно удалена')
      } else {
        showError(data.error || 'Ошибка удаления сферы')
      }
    } catch (error) {
      const formattedError = await handleError(error, { context: 'SpheresPage.handleDelete', sphereId: id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loading />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Сферы</h1>
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
            {(user?.role === 'ADMIN' || checkPermission(user, ALL_PERMISSIONS.ADD_SPHERE)) && (
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
                    maxLength={50}
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
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
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
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => handleEdit(sphere, e)}
                            className="text-blue-600 hover:text-blue-900 cursor-pointer"
                            title="Редактировать название"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(sphere, e)}
                            className="text-red-600 hover:text-red-900 cursor-pointer"
                            title="Удалить сферу"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isOpen}
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        variant={variant}
        onConfirm={handleConfirm}
        onCancel={handleConfirmCancel}
      />

      {/* Модальное окно редактирования сферы */}
      {editingSphere && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onClick={handleCancelEdit}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  Редактировать сферу
                </h2>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название сферы
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value)
                    setEditError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdate()
                    } else if (e.key === 'Escape') {
                      handleCancelEdit()
                    }
                  }}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    editError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Введите название сферы"
                  maxLength={50}
                  autoFocus
                />
                {editError && (
                  <p className="mt-1 text-sm text-red-600">{editError}</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

