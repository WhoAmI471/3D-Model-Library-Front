'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateTime, proxyUrl } from '@/lib/utils'
import Link from 'next/link'
import apiClient from '@/lib/apiClient'
import ConfirmModal from './ConfirmModal'
import { getErrorMessage, handleError } from '@/lib/errorHandler'
import { useNotification } from '@/hooks/useNotification'
import { useConfirm } from '@/hooks/useConfirm'
import { 
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

export const DeletedModelCard = ({ deletedModel }) => {
  const router = useRouter()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [validImages, setValidImages] = useState(deletedModel.images || [])
  const { success, error: showError } = useNotification()
  const { isOpen, message, title, confirmText, cancelText, variant, showConfirm, handleConfirm, handleCancel } = useConfirm()

  useEffect(() => {
    setValidImages(deletedModel.images || [])
    setCurrentImageIndex(0)
  }, [deletedModel.images])

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

  const openModal = (index) => {
    setCurrentImageIndex(index)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === validImages.length - 1 ? 0 : prev + 1
    )
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? validImages.length - 1 : prev - 1
    )
  }

  const handleDeletePermanently = async () => {
    const confirmed = await showConfirm({
      message: `Вы уверены, что хотите полностью удалить модель "${deletedModel.title}"? Это действие нельзя отменить.`,
      variant: 'danger',
      confirmText: 'Удалить полностью'
    })
    
    if (confirmed) {
      try {
        await apiClient.deletedModels.delete(deletedModel.id)
        success('Модель полностью удалена')
        router.push('/dashboard/deleted-models')
      } catch (error) {
        const formattedError = await handleError(error, { context: 'DeletedModelCard.handleDeletePermanently', modelId: deletedModel.id })
        const errorMessage = getErrorMessage(formattedError)
        showError(errorMessage)
      }
    }
  }

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
          <h1 className="text-2xl font-semibold text-gray-900 leading-none pb-0">{deletedModel.title}</h1>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={handleDeletePermanently}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <TrashIcon className="h-5 w-5" />
              Удалить полностью
            </button>
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
                    alt={`${deletedModel.title} - изображение ${index + 1}`}
                    className="object-cover w-full h-full"
                    onError={(e) => handleImageError(e, image)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Описание */}
        {deletedModel.description && (
          <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Описание</div>
            <p className="text-sm text-gray-900 whitespace-pre-line leading-relaxed">{deletedModel.description}</p>
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
                  alt={`${deletedModel.title} - изображение ${currentImageIndex + 1}`}
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
            <div className="text-sm font-medium text-gray-900 truncate">{deletedModel.authorName || 'Не указан'}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Сфера</div>
            <div className="text-sm font-medium text-gray-900 truncate">{deletedModel.sphereName || 'Не указана'}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Дата создания</div>
            <div className="text-sm font-medium text-gray-900">{formatDateTime(deletedModel.createdAt)}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Дата удаления</div>
            <div className="text-sm font-medium text-gray-900">{formatDateTime(deletedModel.deletedAt)}</div>
          </div>
        </div>

        {/* Проекты */}
        {deletedModel.projectNames && deletedModel.projectNames.length > 0 && (
          <div className="mb-8">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Проекты</div>
            <div className="flex flex-wrap gap-2">
              {deletedModel.projectNames.map((projectName, idx) => (
                <span
                  key={idx}
                  className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                >
                  {projectName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Информация об удалении */}
        <div className="mb-8 bg-red-50 rounded-lg p-6 border border-red-200">
          <div className="text-xs text-red-600 uppercase tracking-wide mb-2">Информация об удалении</div>
          {deletedModel.user && (
            <div className="text-sm text-gray-900 mb-1">
              Удалил: {deletedModel.user.name} ({deletedModel.user.email})
            </div>
          )}
          {deletedModel.deletionComment && (
            <div className="text-sm text-gray-900 mt-2">
              Комментарий: {deletedModel.deletionComment}
            </div>
          )}
        </div>
      </div>

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
  )
}
