'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'
import { formatDateTime, proxyUrl } from '@/lib/utils'
import { checkAnyPermission, checkPermission } from '@/lib/permission'
import Link from 'next/link';
import apiClient from '@/lib/apiClient'
import DeleteReasonModal from './DeleteReasonModal'
import ConfirmModal from './ConfirmModal'
import { getErrorMessage, handleError } from '@/lib/errorHandler'
import { useNotification } from '@/hooks/useNotification'
import { useConfirm } from '@/hooks/useConfirm'
import { 
  ArrowDownTrayIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

export const ModelCard = ({ model, onDeleteRequest, projectId }) => {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false);
  const [user, setUser] = useState();
  const [validImages, setValidImages] = useState(model.images || []);
  const { success, error: showError } = useNotification()
  const { isOpen, message, title, confirmText, cancelText, variant, showConfirm, handleConfirm, handleCancel } = useConfirm()
  
  // Функция для получения текущей версии модели
  const getCurrentVersion = () => {
    if (model.versions && model.versions.length > 0) {
      const sortedVersions = [...model.versions].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )
      return sortedVersions[0].version
    }
    return '1.0'
  }

  const [selectedVersion, setSelectedVersion] = useState({
    fileUrl: model.fileUrl,
    images: model.images || [],
    version: getCurrentVersion()
  });

  useEffect(() => {
    const currentVersion = getCurrentVersion()
    if (model.images && model.images.length > 0) {
      setSelectedVersion({ 
        fileUrl: model.fileUrl, 
        images: model.images, 
        version: currentVersion
      })
      setValidImages(model.images)
    } else if (model.versions && model.versions.length > 0) {
      const sortedVersions = [...model.versions].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )
      const latestVersion = sortedVersions[0]
      setSelectedVersion(latestVersion)
      setValidImages(latestVersion.images || [])
    } else {
      setSelectedVersion({ fileUrl: model.fileUrl, images: [], version: currentVersion })
      setValidImages([])
    }
    setCurrentImageIndex(0)
  }, [model.images, model.fileUrl, model.versions])
  
  const handleImageError = (e, imageUrl) => {
    if (e.target) {
      e.target.style.display = 'none'
    }
    setValidImages(prev => {
      const filtered = prev.filter(img => img !== imageUrl)
      if (filtered.length === 0) {
        setIsModalOpen(false)
        setCurrentImageIndex(0)
      } else if (currentImageIndex >= filtered.length) {
        setCurrentImageIndex(Math.max(0, filtered.length - 1))
      }
      return filtered
    })
  }
  
  useEffect(() => {
    const load = async () => {
      try {
        const userData = await apiClient.auth.me()
        setUser(userData.user)
      } catch (err) {
        console.error('Ошибка загрузки пользователя:', err)
      }
    }
    load()
  }, [])

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(proxyUrl(selectedVersion.fileUrl));
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

  const openModal = (index) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === validImages.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? validImages.length - 1 : prev - 1
    );
  };

  const handleDeleteRequest = async () => {
    // Если модель уже помечена на удаление, не обрабатываем запрос
    if (model.markedForDeletion) {
      return
    }
    if (user?.role === 'ADMIN') {
      const confirmed = await showConfirm({
        message: `Вы уверены, что хотите удалить модель "${model.title}"?`,
        variant: 'danger',
        confirmText: 'Удалить'
      })
      
      if (confirmed) {
        onDeleteRequest(model.id, true).then((result) => {
          if (result?.success && result.redirect) {
            router.push('/dashboard');
          }
        });
      }
    } else {
      setShowDeleteReasonModal(true);
    }
  };

  const handleDeleteConfirm = async (reason) => {
    try {
      const data = await apiClient.models.requestDeletion(model.id, reason)
      success(data.message || 'Запрос на удаление отправлен')
      setShowDeleteReasonModal(false)
      // Обновляем страницу, чтобы показать обновленную модель с пометкой
      router.refresh()
    } catch (error) {
      const formattedError = await handleError(error, { context: 'ModelCard.handleDeleteConfirm', modelId: model.id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
    }
  };

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Заголовок и кнопки */}
        <div className="mb-6 pb-6 border-b border-gray-200 flex justify-between items-end gap-4 relative">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="absolute -left-12 top-0 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="Назад"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
          <h1 className="text-2xl font-semibold text-gray-900 leading-none pb-0">{model.title}</h1>
          <div className="flex gap-3 flex-shrink-0">
            {checkPermission(user, 'download_models') && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                {isDownloading ? 'Скачивание...' : 'Скачать'}
              </button>
            )}
            
            {checkAnyPermission(user, 'edit_models', 'edit_model_description') && (
              <Link 
                href={`/dashboard/models/update/${model.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                <PencilIcon className="h-5 w-5" />
                Изменить
              </Link>
            )}
            
            {checkPermission(user, 'delete_models') && (
              <button 
                onClick={handleDeleteRequest}
                disabled={model.markedForDeletion}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  model.markedForDeletion
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 cursor-pointer'
                }`}
                title={model.markedForDeletion ? 'Запрос на удаление уже активен для этой модели' : 'Удалить'}
              >
                <TrashIcon className="h-5 w-5" />
                Удалить
              </button>
            )}
          </div>
        </div>

        {/* Галерея изображений */}
        {validImages && validImages.length > 0 && (
          <div className="mb-8">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {validImages.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="relative flex-shrink-0 w-64 h-48 cursor-pointer bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                  onClick={() => openModal(index)}
                >
                  <img
                    src={proxyUrl(image)}
                    alt={`${model.title} - изображение ${index + 1}`}
                    className="object-cover w-full h-full"
                    onError={(e) => handleImageError(e, image)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Описание */}
        {model.description && (
          <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Описание</div>
            <p className="text-sm text-gray-900 whitespace-pre-line leading-relaxed">{model.description}</p>
          </div>
        )}
        
        {/* Модальное окно для просмотра изображений */}
        {isModalOpen && validImages.length > 0 && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <div 
              className="relative max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={closeModal}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10 cursor-pointer"
              >
                <XMarkIcon className="h-8 w-8" />
              </button>
              
              <div className="relative h-[70vh] w-full flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden">
                <img
                  src={proxyUrl(validImages[currentImageIndex])}
                  alt={`${model.title} - изображение ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => handleImageError(e, validImages[currentImageIndex])}
                />
                
                {validImages.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors cursor-pointer"
                    >
                      <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                    
                    <button 
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors cursor-pointer"
                    >
                      <ChevronRightIcon className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
              
              {validImages.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  {validImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        index === currentImageIndex ? 'bg-white w-8' : 'bg-white/50 w-2'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Информация о модели */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Автор</div>
            <div className="text-sm font-medium text-gray-900 truncate">{model.author?.name || 'Не указан'}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Версия</div>
            <div className="text-sm font-medium text-gray-900">{getCurrentVersion()}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Сфера</div>
            <div className="text-sm font-medium text-gray-900 truncate">{model.sphere?.name || 'Не указана'}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Дата изменения</div>
            <div className="text-sm font-medium text-gray-900">{formatDateTime(model.updatedAt)}</div>
          </div>
        </div>

        {/* Проекты */}
        {model.projects && model.projects.length > 0 && (
          <div className="mb-8">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Проекты</div>
            <div className="flex flex-wrap gap-2">
              {model.projects.map(project => (
                <Link 
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="inline-flex items-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors cursor-pointer border border-blue-200"
                >
                  {project.name}
                </Link>
              ))}
            </div>
          </div>
        )}


        {/* История изменений */}
        {model.logs && model.logs.length > 0 && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">История изменений</h3>
            <div className="space-y-3">
              {model.logs.map((log, index) => (
                <div key={index} className="text-sm">
                  <span className="text-gray-500">{formatDateTime(log.createdAt)}</span>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="font-medium text-gray-900">{log.user?.name || 'Система'}</span>
                  <span className="text-gray-600 ml-2">{log.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <DeleteReasonModal
        isOpen={showDeleteReasonModal}
        onClose={() => setShowDeleteReasonModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmModal
        isOpen={isOpen}
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        variant={variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
};
