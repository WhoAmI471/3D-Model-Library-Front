'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { AnimatePresence } from 'framer-motion'
import { ModelPreview } from "@/components/ModelPreview"
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import apiClient from '@/lib/apiClient'

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [models, setModels] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    action: '',
    user: '',
    dateFrom: '',
    dateTo: ''
  })
  
  const [previewModel, setPreviewModel] = useState(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [showPreview, setShowPreview] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [autoPlayInterval, setAutoPlayInterval] = useState(null)
  const [expandedLogId, setExpandedLogId] = useState(null)
  
  const router = useRouter()
  
  const toggleLogExpand = (logId, e) => {
    e.stopPropagation() // Предотвращаем переход на страницу модели
    setExpandedLogId(expandedLogId === logId ? null : logId)
  }

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        ...(filters.action && { action: filters.action }),
        ...(filters.user && { user: filters.user }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      })

      const logsData = await apiClient.logs.getAll({
        page: page.toString(),
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        ...(filters.action && { action: filters.action }),
        ...(filters.user && { user: filters.user }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      })
      
      setLogs(logsData.logs || [])
      
      const modelsData = await apiClient.models.getAll()
      setModels(modelsData)
      
      setTotalPages(logsData.totalPages || 1)
    } catch (error) {
      console.error('Ошибка загрузки логов:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
    setExpandedLogId(null) // Сбрасываем развернутый лог при изменении данных
  }, [page, filters, sortConfig]) // Добавляем sortConfig в зависимости

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
    setPage(1)
  }

  const requestSort = (key) => {
    let direction = 'desc'
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'desc' ? 'asc' : 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const resetFilters = () => {
    setFilters({
      action: '',
      user: '',
      dateFrom: '',
      dateTo: ''
    })
    setPage(1)
  }
  
  const handleMouseMove = (event) => {
    // Позиция превью не должна обновляться при движении мыши
    // Превью должно оставаться на месте, где было показано
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
    if (!previewModel || !previewModel.images?.length || isHovering) return
    
    stopAutoPlay()
    
    const interval = setInterval(() => {
      // Проверяем isHovering перед каждым перелистыванием
      if (!previewModel || !previewModel.images?.length || isHovering) {
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

    console.log(models)
    const currentModel = models.find(item => item.id === model?.id);
    if (currentModel?.images?.length > 0) {
      console.log("OPEN")
      const rect = event.currentTarget.getBoundingClientRect()
      const previewWidth = 320
      setPreviewPosition({
        x: rect.left - previewWidth - 20, // Позиция слева от строки
        y: rect.top - 80
      })
      setPreviewModel(currentModel)
      setCurrentImageIndex(0)
      setShowPreview(true)
    }
    else
    {
      setShowPreview(false)
    }
  }
  
  const handleMouseLeave = () => {
    setShowPreview(false)
    setPreviewModel(null)
    stopAutoPlay()
  }

  useEffect(() => {
    // Автоперелистывание работает только если превью показано и курсор НЕ на мини-окне
    if (showPreview && previewModel?.images?.length && !isHovering) {
      startAutoPlay()
    } else {
      stopAutoPlay()
    }
    return () => {
      stopAutoPlay()
    }
  }, [previewModel, showPreview, isHovering])
  useEffect(() => {
    return () => {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval)
      }
    }
  }, [autoPlayInterval])

  
  return (
    <div className="min-h-full bg-white" onMouseLeave={handleMouseLeave}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-6">Журнал событий</h1>

          {/* Фильтры */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="action"
                  value={filters.action}
                  onChange={handleFilterChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Фильтр по действию"
                />
              </div>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="user"
                  value={filters.user}
                  onChange={handleFilterChange}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Фильтр по пользователю"
                />
              </div>
              <div>
                <input
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Дата с"
                />
              </div>
              <div>
                <input
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Дата по"
                />
              </div>
            </div>
            <button
              onClick={resetFilters}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>

        {/* Таблица логов */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('date')}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex items-center">
                  Дата
                  {getSortIcon('date')}
                </div>
              </th>
              <th 
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 max-w-md"
                onClick={() => requestSort('move')} 
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex items-center">
                  Действие
                  {/* {getSortIcon('move')} */}
                </div>
              </th>
              <th 
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('user')}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex items-center">
                  Пользователь
                  {/* {getSortIcon('user')} */}
                </div>
              </th>
              <th 
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => requestSort('model')}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex items-center">
                  Модель
                  {/* {getSortIcon('model')} */}
                </div>
              </th>
              {/* <th className="py-3 px-4 text-left">Дата</th> */}
              {/* <th className="py-3 px-4 text-left">Действие</th>
              <th className="py-3 px-4 text-left">Пользователь</th>
              <th className="py-3 px-4 text-left">Модель</th> */}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="4" className="py-4 text-center">
                  Загрузка...
                </td>
              </tr>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 odd:bg-blue-50 even:bg-white" onMouseEnter={(e) => handleMouseEnter(log.model, e)}>
                  <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900" onClick={() => router.push(`/dashboard/models/${log.model?.id}`)}>
                    {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </td>
                  <td 
                    className="px-6 py-2 text-sm text-gray-500 max-w-md cursor-pointer" 
                    onClick={(e) => toggleLogExpand(log.id, e)}
                    title={expandedLogId === log.id ? undefined : log.action}
                  >
                    <div className={expandedLogId === log.id ? '' : 'truncate'}>
                      {log.action}
                    </div>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500" onClick={() => router.push(`/dashboard/models/${log.model?.id}`)}>
                    {log.user ? `${log.user.name} (${log.user.email})` : 'Система'}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium" onClick={() => router.push(`/dashboard/models/${log.model?.id}`)}>
                    {log.model?.title || '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 text-center text-gray-500">
                  Записи не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Назад
            </button>
            <div className="flex items-center px-4 text-sm text-gray-600">
              Страница {page} из {totalPages}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Вперед
            </button>
          </div>
        </div>
      )}
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
            setIsHovering={setIsHovering}
          />
        )}
      </AnimatePresence>
    </div>
  )
}