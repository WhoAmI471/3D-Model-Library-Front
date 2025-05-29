'use client'
import { useEffect, useState } from 'react';
import { TrashIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function AdminDeletionPanel({ userRole }) {
  const [modelsForDeletion, setModelsForDeletion] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'markedAt', direction: 'desc' });

  useEffect(() => {
    if (userRole === 'ADMIN') {
      fetchPendingDeletions();
    }
  }, [userRole]);

  const fetchPendingDeletions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/models?markedForDeletion=true&t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${response.status}`);
      }
      
      const data = await response.json();
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
    <div className="rounded-lg p-6 w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Запросы на удаление моделей</h2>
        <button 
          onClick={fetchPendingDeletions}
          className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100"
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
        <div className="overflow-x-auto">
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
                <tr key={model.id} className="hover:bg-gray-50 odd:bg-blue-50 even:bg-white">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{model.title}</div>
                    <div className="text-sm text-gray-500">{model.description?.substring(0, 50)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{model.author?.name || 'Неизвестно'}</div>
                    <div className="text-sm text-gray-500">{model.author?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{model.markedBy?.name || 'Неизвестно'}</div>
                    <div className="text-sm text-gray-500">{model.markedBy?.role}</div>
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
    </div>
  );
}