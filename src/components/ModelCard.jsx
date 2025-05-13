'use client'
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export const ModelCard = ({ model }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  // Функция для скачивания файла
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

  // Функция для форматирования даты
  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  // Перевод сферы на русский
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
          {/* Изображения */}
          <div className="w-full md:w-1/3">
            {model.images?.length > 0 ? (
              <div className="relative h-48 w-full rounded-lg overflow-hidden">
                <Image
                  src={model.images[0]}
                  alt={model.title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Нет изображения</span>
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
                <h2 className="text-lg font-semibold text-gray-800">Проект:</h2>
                <p>{model.project?.title || 'Не указан'}</p>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Сфера:</h2>
                <p>{getSphereName(model.sphere)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`px-4 py-2 rounded-md ${isDownloading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'} text-white`}
          >
            {isDownloading ? 'Скачивание...' : 'Скачать'}
          </button>
          <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800">
            Изменить
          </button>
          <button className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md">
            Удалить
          </button>
        </div>

        {/* История изменений */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">История изменений</h2>
          <div className="space-y-2">
            {model.logs?.map((log, index) => (
              <div key={index} className="border-b pb-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-800">{formatDate(log.createdAt)}</span>
                  <span className="text-gray-600">{log.user?.name}</span>
                </div>
                <p>{log.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};