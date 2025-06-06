'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { AnimatePresence } from 'framer-motion'
import { ModelPreview } from "@/components/ModelPreview"

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
  
  const router = useRouter()

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

      const response = await fetch(`/api/logs?${params}`)
      const data = await response.json()
      
      setLogs(data.logs)
      
      const modelsRes = await fetch('/api/models')
      const modelsData = await modelsRes.json()
      setModels(modelsData)
      
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Ошибка загрузки логов:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
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
    
    console.log(models)
    const currentModel = models.find(item => item.id === model?.id);
    if (currentModel?.images?.length > 0) {
      console.log("OPEN")
      const rect = event.currentTarget.getBoundingClientRect()
      setPreviewPosition({
        x: rect.right + 100, // Позиция справа от строки
        y: rect.top - 80
      })
      setPreviewModel(currentModel)
      setCurrentImageIndex(0)
      setShowPreview(true)
      startAutoPlay()
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
    return () => {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval)
      }
    }
  }, [autoPlayInterval])

  
  return (
    <div className="p-4 text-gray-800" onMouseLeave={handleMouseLeave}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Журнал событий</h1>
      </div>

      {/* Фильтры */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block mb-1 text-sm">Действие</label>
            <input
              type="text"
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              className="border p-2 rounded w-full"
              placeholder="Фильтр по действию"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Пользователь</label>
            <input
              type="text"
              name="user"
              value={filters.user}
              onChange={handleFilterChange}
              className="border p-2 rounded w-full"
              placeholder="Фильтр по пользователю"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Дата с</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Дата по</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="border p-2 rounded w-full"
            />
          </div>
        </div>
        <button
          onClick={resetFilters}
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm"
        >
          Сбросить фильтры
        </button>
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
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500" onClick={() => router.push(`/dashboard/models/${log.model?.id}`)}>{log.action}</td>
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
      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
              >
              Назад
            </button>
            <div className="flex items-center px-4">
              Страница {page} из {totalPages}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border rounded disabled:opacity-50"
              >
              Вперед
            </button>
          </div>
        </div>
      )}
    </div>
  )
}