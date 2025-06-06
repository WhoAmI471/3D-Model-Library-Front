'use client'
import { useEffect, useState } from 'react';
import { TrashIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AnimatePresence } from 'framer-motion'
import { ModelPreview } from "@/components/ModelPreview"

export default function AdminDeletionPanel({ userRole }) {
  const [modelsForDeletion, setModelsForDeletion] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'markedAt', direction: 'desc' });
  
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
    if (model?.images?.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect()
      setPreviewPosition({
        x: rect.right + 100, // Позиция справа от строки
        y: rect.top - 80
      })
      setPreviewModel(model)
      setCurrentImageIndex(0)
      setShowPreview(true)
      startAutoPlay()
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

  const fetchPendingDeletions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/models?markedForDeletion=true&t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${response.status}`);
      }
      
      const data = await response.json();
      
      const employeesResponse = await fetch('/api/employees')
      const employeesData = await employeesResponse.json()
      // console.log(data);
      // console.log(employeesData);
      // console.log(data[0].markedById);
      setModelsForDeletion(data.filter(model => model.markedForDeletion));
    } catch (err) {
      console.error('Ошибка загрузки запросов на удаление:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async (modelId, approve) => {
    try {
      const res = await fetch(`/api/models/${modelId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      setModelsForDeletion(prev => prev.filter(m => m.id !== modelId));
    } catch (err) {
      console.error('Ошибка обработки запроса:', err);
      setError(err.message);
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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

  if (userRole !== 'ADMIN') return null;

  return (
    <div className="rounded-lg p-6 w-full max-w-7xl mx-auto" onMouseLeave={handleMouseLeave}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Запросы на удаление моделей</h2>
        <button 
          onClick={fetchPendingDeletions}
          className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100"
          onMouseLeave={handleMouseLeave}
        >
          Обновить
        </button>
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
        <div className="overflow-x-auto" onMouseLeave={handleMouseLeave}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('title')}
                >
                  <div className="flex items-center">
                    Модель
                    {sortConfig.key === 'title' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Автор модели
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Запросил удаление
                </th>
                <th 
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('markedAt')}
                >
                  <div className="flex items-center">
                    Дата запроса
                    {sortConfig.key === 'markedAt' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedModels.map(model => (
                <tr key={model.id} className="hover:bg-gray-50 odd:bg-blue-50 even:bg-white" onMouseEnter={(e) => handleMouseEnter(model, e)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{model.title}</div>
                    <div className="text-sm text-gray-500">{model.description?.substring(0, 50)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{model.author?.name || 'Неизвестно'}</div>
                    <div className="text-sm text-gray-500">{model.author?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{model.markedById || 'Неизвестно'}</div>
                    <div className="text-sm text-gray-500">{model.markedById}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(model.markedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleDecision(model.id, false)}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                        title="Отклонить"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDecision(model.id, true)}
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
    </div>
  );
}