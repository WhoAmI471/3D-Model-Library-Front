'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Loading from '@/components/Loading'
import SphereForm from '@/components/SphereForm'
import { formatDateTime } from '@/lib/utils'
import { checkPermission } from '@/lib/permission'
import { ALL_PERMISSIONS } from '@/lib/roles'
import apiClient from '@/lib/apiClient'
import { getErrorMessage, handleError } from '@/lib/errorHandler'
import { useNotification } from '@/hooks/useNotification'
import { useConfirm } from '@/hooks/useConfirm'
import ConfirmModal from '@/components/ConfirmModal'
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

export default function SpheresPage() {
  const [spheres, setSpheres] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [currentSphere, setCurrentSphere] = useState(null)
  const [user, setUser] = useState(null)
  const { success, error: showError } = useNotification()
  const { isOpen, message, title, confirmText, cancelText, variant, showConfirm, handleConfirm, handleCancel: handleConfirmCancel } = useConfirm()

  // Загрузка сфер
  const fetchSpheres = async () => {
    try {
      const spheresData = await apiClient.spheres.getAll()
      setSpheres(spheresData)
    } catch (error) {
      console.error('Ошибка загрузки сфер:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await fetchSpheres()
      try {
        const userData = await apiClient.auth.me()
        setUser(userData.user || null)
      } catch (error) {
        console.error('Ошибка загрузки пользователя:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
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

  // Обработка добавления/обновления сферы
  const handleSphereSubmit = async (sphereData) => {
    try {
      if (currentSphere) {
        await apiClient.spheres.update(currentSphere.id, sphereData)
        success('Сфера успешно обновлена')
      } else {
        await apiClient.spheres.create(sphereData)
        success('Сфера успешно создана')
      }
      
      // Перезагружаем список сфер, чтобы получить актуальные данные
      await fetchSpheres()
      
      setShowAddForm(false)
      setCurrentSphere(null)
    } catch (error) {
      const formattedError = await handleError(error, { context: 'SpheresPage.handleSphereSubmit', sphereId: currentSphere?.id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
      throw error
    }
  }

  const handleAdd = () => {
    setCurrentSphere(null)
    setShowAddForm(true)
  }

  const handleEdit = async (sphere, e) => {
    e.stopPropagation()
    try {
      // Загружаем полную сферу с моделями
      const fullSphere = await apiClient.spheres.getById(sphere.id)
      setCurrentSphere(fullSphere)
      setShowAddForm(true)
    } catch (error) {
      const formattedError = await handleError(error, { context: 'SpheresPage.handleEdit', sphereId: sphere.id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
    }
  }

  // Обработка удаления сферы
  const handleDelete = async (sphere, e) => {
    e.stopPropagation()
    
    const confirmed = await showConfirm({
      message: `Вы уверены, что хотите удалить сферу "${sphere.name}"?${sphere.modelsCount > 0 ? ` К сфере привязано ${sphere.modelsCount} моделей, они будут автоматически отвязаны.` : ''}`,
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

          {/* Форма сферы */}
          {showAddForm && (
            <SphereForm
              sphere={currentSphere}
              onSubmit={handleSphereSubmit}
              onCancel={() => {
                setShowAddForm(false)
                setCurrentSphere(null)
              }}
            />
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
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Название
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Моделей
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата создания
                  </th>
                  {(user?.role === 'ADMIN' || checkPermission(user, ALL_PERMISSIONS.EDIT_SPHERE)) && (
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSpheres.map((sphere) => (
                  <tr key={sphere.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/spheres/${sphere.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer"
                      >
                        {sphere.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sphere.modelsCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(sphere.createdAt)}
                    </td>
                    {(user?.role === 'ADMIN' || checkPermission(user, ALL_PERMISSIONS.EDIT_SPHERE)) && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {checkPermission(user, ALL_PERMISSIONS.EDIT_SPHERE) && (
                            <button
                              onClick={(e) => handleEdit(sphere, e)}
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Редактировать"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          )}
                          {user?.role === 'ADMIN' && (
                            <button
                              onClick={(e) => handleDelete(sphere, e)}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Удалить"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
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

    </div>
  )
}
