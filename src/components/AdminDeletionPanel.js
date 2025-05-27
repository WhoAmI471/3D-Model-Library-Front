'use client'
import { useEffect, useState } from 'react';

export default function AdminDeletionPanel({ userRole }) {
  const [modelsForDeletion, setModelsForDeletion] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userRole === 'ADMIN') {
      fetchPendingDeletions();
    }
  }, [userRole]);

  const fetchPendingDeletions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/models?markedForDeletion=true' + Date.now());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Дополнительная проверка на клиенте
      const filteredModels = data.filter(model => 
        model.markedForDeletion && model.markedById
      );
      
      setModelsForDeletion(filteredModels);
    } catch (err) {
      console.error('Error fetching models for deletion:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async (modelId, approve) => {
    const res = await fetch(`/api/models/${modelId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve })
    });
    
    if (res.ok) {
      fetchPendingDeletions(); // Обновляем список
    }
  };

  if (userRole !== 'ADMIN') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-96 max-h-[80vh] overflow-y-auto">
      <h3 className="font-bold text-lg mb-4">Запросы на удаление моделей</h3>
      
      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}
      
      {isLoading ? (
        <p>Загрузка...</p>
      ) : modelsForDeletion.length === 0 ? (
        <p>Нет запросов на удаление</p>
      ) : (
        <ul className="space-y-3">
          {modelsForDeletion.map(model => (
            <li key={model.id} className="border-b pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{model.title}</p>
                  <p className="text-sm text-gray-600">
                    Автор: {model.author?.name || 'Неизвестно'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Запросил: {model.markedBy?.name || 'Неизвестно'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(model.markedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecision(model.id, true)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Удалить
                  </button>
                  <button
                    onClick={() => handleDecision(model.id, false)}
                    className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}