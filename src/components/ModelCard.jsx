'use client'
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation'
import Link from 'next/link';

export const ModelCard = ({ model, userRole, onDeleteRequest }) => {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(model.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model.title}.zip` || 'model.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Ошибка при скачивании:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (userRole === 'ADMIN') {
      if (confirm('Вы уверены, что хотите удалить эту модель?')) {
        const result = await onDeleteRequest(model.id, true);
        if (result?.success && result.redirect) {
          router.push(result.redirect);
        }
      }
    } else {
      if (confirm('Отправить запрос на удаление администратору?')) {
        try {
          const response = await fetch(`/api/models/${model.id}`, {
            method: 'PUT'
          });
          
          const result = await response.json();
          
          if (response.ok) {
            alert(result.message);
            router.refresh(); // Обновляем страницу
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          alert(error.message);
        }
      }
    }
  };

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  const getSphereName = (sphere) => {
    switch (sphere) {
      case 'CONSTRUCTION': return 'Строительство';
      case 'CHEMISTRY': return 'Химия';
      case 'INDUSTRIAL': return 'Промышленность';
      case 'MEDICAL': return 'Медицина';
      default: return 'Другое';
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      {/* Хлебные крошки */}
      <div className="px-6 py-2 bg-gray-50 text-sm text-gray-600">
        <Link href="/projects">Проекты</Link> / 
        <Link href={`/projects/${model.project?.id}`}> {model.project?.title}</Link> / 
        <span className="font-medium"> {model.title}</span>
      </div>

      {/* Основное содержимое */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">{model.title}</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Галерея изображений */}
          <div className="w-full md:w-1/3">
            {model.images?.length > 0 ? (
              <div className="space-y-4">
                {/* Основное изображение */}
                <div className="relative h-64 w-full rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={model.images[activeImageIndex]}
                    alt={`${model.title} - изображение ${activeImageIndex + 1}`}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                
                {/* Миниатюры */}
                <div className="grid grid-cols-4 gap-2">
                  {model.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`relative h-16 w-full rounded-md overflow-hidden border-2 ${
                        activeImageIndex === index 
                          ? 'border-blue-500' 
                          : 'border-transparent'
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`Миниатюра ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Нет изображений</span>
              </div>
            )}
          </div>

          {/* Информация о модели */}
          <div className="w-full md:w-2/3 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Автор:</h2>
              <p>{model.author?.name || 'Не указан'}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800">Описание:</h2>
              <p className="whitespace-pre-line">{model.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Дата изменения:</h2>
                <p>{formatDate(model.updatedAt)}</p>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Проекты:</h2>
                <p>{model.projects?.map(p => p.name).join(', ') || '—'}</p>
                
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Сфера:</h2>
                <p>{getSphereName(model.sphere)}</p>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Изображений:</h2>
                <p>{model.images?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`px-4 py-2 rounded-md ${
              isDownloading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {isDownloading ? 'Скачивание...' : 'Скачать модель'}
          </button>
          
          {model.images?.length > 0 && (
            <button
              onClick={() => {
                const imageWindow = window.open('', '_blank');
                model.images.forEach(img => {
                  imageWindow.document.write(
                    `<img src="${img}" style="max-width: 100%; margin-bottom: 10px;" alt="Изображение модели"/>`
                  );
                });
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
            >
              Открыть все изображения
            </button>
          )}
          
          <Link 
            href={`/dashboard/models/update/${model.id}`}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800"
          >
            Редактировать
          </Link>
          
          <button 
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
            onClick={handleDeleteRequest}
          >
            {userRole === 'ADMIN' ? 'Удалить' : 'Запросить удаление'}
          </button>
        </div>

        {/* История изменений */}
        {model.logs?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">История изменений</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {model.logs.map((log, index) => (
                <div key={index} className="border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-800">
                      {formatDate(log.createdAt)}
                    </span>
                    <span className="text-gray-600">
                      {log.user?.name || 'Система'}
                    </span>
                  </div>
                  <p className="text-sm">{log.action}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};