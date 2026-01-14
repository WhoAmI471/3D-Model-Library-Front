'use client'
import { useState, useEffect } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useModal } from '@/hooks/useModal'

export default function ConfirmDeleteAllModal({ 
  isOpen, 
  onConfirm, 
  onCancel,
  count = 0
}) {
  const [timeLeft, setTimeLeft] = useState(10)
  const modalHandlers = useModal(onCancel)

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(10)
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [isOpen])

  const handleConfirm = () => {
    if (timeLeft === 0) {
      onConfirm()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onMouseDown={modalHandlers.handleOverlayMouseDown}
      onClick={modalHandlers.handleOverlayClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onMouseDown={modalHandlers.handleContentMouseDown}
        onClick={modalHandlers.handleContentClick}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 text-red-600">
              <ExclamationTriangleIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Удалить все полностью?
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Вы собираетесь полностью удалить {count} моделей из истории. Это действие нельзя отменить.
              </p>
              <p className="text-xs text-gray-500">
                Для подтверждения нажмите кнопку после окончания таймера
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={timeLeft > 0}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timeLeft > 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
              }`}
            >
              {timeLeft > 0 ? `Удалить (${timeLeft}с)` : 'Удалить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
