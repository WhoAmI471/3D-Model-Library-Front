'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrashIcon, XCircleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { AnimatePresence } from 'framer-motion'
import { ModelPreview } from "@/components/ModelPreview"
import apiClient from '@/lib/apiClient'
import { getErrorMessage, handleError } from '@/lib/errorHandler'
import { useNotification } from '@/hooks/useNotification'

export default function AdminDeletionPanel({ userRole }) {
  const router = useRouter();
  const [modelsForDeletion, setModelsForDeletion] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'markedAt', direction: 'desc' });
  const [expandedReasonId, setExpandedReasonId] = useState(null);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const { success, error: showError } = useNotification()
  
  const [previewModel, setPreviewModel] = useState(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [showPreview, setShowPreview] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [autoPlayInterval, setAutoPlayInterval] = useState(null)

  useEffect(() => {
    if (userRole === 'ADMIN') {
      fetchPendingDeletions();
    }
  }, [userRole]);

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
    if (model?.images?.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect()
      const previewWidth = 320
      setPreviewPosition({
        x: rect.left - previewWidth - 20, // Позиция слева от строки
        y: rect.top - 80
      })
      setPreviewModel(model)
      setCurrentImageIndex(0)
      setShowPreview(true)
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

  const fetchPendingDeletions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/models?markedForDeletion=true&includeAuthor=true&includeMarkedBy=true&t=${Date.now()}`
      );
      
      if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
      
      const data = await response.json();
      setModelsForDeletion(data);
    } catch (err) {
      const formattedError = await handleError(err, { context: 'AdminDeletionPanel.fetchPendingDeletions' })
      const errorMessage = getErrorMessage(formattedError)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  };


  const handleDecision = async (modelId, approve) => {
    try {
      await apiClient.models.delete(modelId, approve)
      setModelsForDeletion(prev => prev.filter(m => m.id !== modelId))
      if (approve) {
        success('Модель успешно удалена')
      } else {
        success('Запрос на удаление отклонен')
      }
    } catch (err) {
      const formattedError = await handleError(err, { context: 'AdminDeletionPanel.handleDecision', modelId, approve })
      const errorMessage = getErrorMessage(formattedError)
      setError(errorMessage)
      showError(errorMessage)
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const showReasonModal = (reason, e) => {
    e.stopPropagation(); // Предотвращаем переход на страницу модели
    setSelectedReason(reason);
    setReasonModalOpen(true);
  };

  const sortedModels = [...modelsForDeletion].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  if (userRole !== 'ADMIN') {
    return (
      <div className="min-h-full bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Доступ запрещен</h2>
          <p className="text-gray-600">У вас нет прав доступа для этого.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white" onMouseLeave={handleMouseLeave}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Запросы на удаление моделей</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : modelsForDeletion.length === 0 ? (
          <div className="bg-gray-50 text-gray-500 p-8 text-center rounded-lg">
            Нет ожидающих запросов на удаление
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'auto' }}>
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-40"
                  onClick={() => requestSort('title')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="flex items-center">
                    Модель
                    {sortConfig.key === 'title' && (
                      <span className="ml-1 text-blue-600">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onMouseLeave={handleMouseLeave}>
                  Автор модели
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" onMouseLeave={handleMouseLeave}>
                  Запросил удаление
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40" onMouseLeave={handleMouseLeave}>
                  Причина
                </th>
                <th 
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('markedAt')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="flex items-center">
                    Дата запроса
                    {sortConfig.key === 'markedAt' && (
                      <span className="ml-1 text-blue-600">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50" onMouseLeave={handleMouseLeave}>
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedModels.map(model => (
                <tr 
                  key={model.id} 
                  className="hover:bg-gray-50 cursor-pointer" 
                  onMouseEnter={(e) => handleMouseEnter(model, e)}
                  onClick={() => router.push(`/dashboard/models/${model.id}`)}
                >
                  <td className="px-6 py-4 w-40">
                    <div className="text-sm font-medium text-gray-900 truncate" title={model.title}>
                      {model.title 
                        ? (model.title.length > 15 
                            ? `${model.title.substring(0, 15)}...` 
                            : model.title)
                        : '-'}
                    </div>
                    <div className="text-sm text-gray-500 truncate" title={model.description}>
                      {model.description 
                        ? (model.description.length > 15 
                            ? `${model.description.substring(0, 15)}...` 
                            : model.description)
                        : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {model.author && model.author.role === 'ARTIST' 
                        ? model.author.name 
                        : 'Сторонняя модель'}
                    </div>
                    <div className="text-sm text-gray-500">{model.author?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{model.markedBy ? model.markedBy.name : 'Пользователь не найден'}</div>
                    <div className="text-sm text-gray-500">
                      {{
                        ADMIN: 'Администратор',
                        ARTIST: 'Художник',
                        PROGRAMMER: 'Программист',
                        MANAGER: 'Менеджер',
                        ANALYST: 'Аналитик',
                        TESTER: 'Тестировщик'
                      }[model.markedBy?.role] || model.markedBy?.role || ''}
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 text-sm text-gray-500 w-40 max-w-40"
                    onMouseLeave={handleMouseLeave}
                  >
                    {model.deletionComment ? (
                      <div 
                        className="flex items-start cursor-pointer group"
                        onClick={(e) => showReasonModal(model.deletionComment, e)}
                      >
                        <InformationCircleIcon className="h-4 w-4 mr-1 text-blue-500 flex-shrink-0 mt-0.5 group-hover:text-blue-600 transition-colors" />
                        <span className="truncate block" title="Нажмите, чтобы увидеть полностью">
                          {model.deletionComment}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Не указана</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(model.markedAt).toLocaleString()}
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDecision(model.id, false);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                        title="Отклонить"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDecision(model.id, true);
                        }}
                        className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50"
                        title="Удалить"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Модальное окно для показа полной причины */}
      {reasonModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setReasonModalOpen(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Причина удаления</h3>
              <button
                onClick={() => setReasonModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                {selectedReason}
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setReasonModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}