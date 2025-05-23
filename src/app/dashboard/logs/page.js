'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    action: '',
    user: '',
    dateFrom: '',
    dateTo: ''
  })

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(filters.action && { action: filters.action }),
        ...(filters.user && { user: filters.user }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo })
      })

      const response = await fetch(`/api/logs?${params}`)
      const data = await response.json()
      
      setLogs(data.logs)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Ошибка загрузки логов:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [page, filters])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
    setPage(1) // Сброс на первую страницу при изменении фильтров
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

  return (
    <div className="p-4">
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
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left">Дата</th>
              <th className="py-3 px-4 text-left">Действие</th>
              <th className="py-3 px-4 text-left">Пользователь</th>
              <th className="py-3 px-4 text-left">Модель</th>
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
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </td>
                  <td className="py-3 px-4">{log.action}</td>
                  <td className="py-3 px-4">
                    {log.user ? `${log.user.name} (${log.user.email})` : 'Система'}
                  </td>
                  <td className="py-3 px-4">
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