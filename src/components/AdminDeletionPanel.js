'use client'
import { useEffect, useState } from 'react';

export default function AdminDeletionPanel({ userRole }) {
  if (userRole !== 'ADMIN') return null;
  
  const [modelsForDeletion, setModelsForDeletion] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'ADMIN') {
      fetchPendingDeletions();
    }
  }, [userRole]);

  const fetchPendingDeletions = async () => {
    try {
      const response = await fetch('/api/models?markedForDeletion=true');
      const data = await response.json();
      setModelsForDeletion(data);
    } catch (error) {
      console.error('Error fetching models for deletion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletion = async (modelId, approve) => {
    try {
      const response = await fetch(`/api/models/${modelId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approve })
      });

      if (response.ok) {
        fetchPendingDeletions(); // Обновляем список после удаления
      }
    } catch (error) {
      console.error('Error processing deletion:', error);
    }
  };


  return (
    <div className="bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-96 max-h-[80vh] overflow-y-auto">
      <h3 className="font-bold text-lg mb-4">Запросы на удаление моделей</h3>
      
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
                    Запросил: {model.markedBy?.name || 'Неизвестно'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeletion(model.id, true)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                  >
                    Удалить
                  </button>
                  <button
                    onClick={() => handleDeletion(model.id, false)}
                    className="px-3 py-1 bg-gray-200 rounded text-sm"
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