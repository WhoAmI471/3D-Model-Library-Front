'use client'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useModal } from '@/hooks/useModal'

export default function ConfirmModal({ 
  isOpen, 
  onConfirm, 
  onCancel,
  title = 'Подтвердите действие',
  message = 'Вы уверены, что хотите выполнить это действие?',
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'danger' // 'danger' | 'warning' | 'info'
}) {
  const modalHandlers = useModal(onCancel)

  if (!isOpen) return null

  const variantStyles = {
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const styles = variantStyles[variant] || variantStyles.danger

  const handleConfirm = () => {
    onConfirm()
  }

  const handleCancel = () => {
    onCancel()
  }

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
            <div className={`flex-shrink-0 ${styles.icon}`}>
              <ExclamationTriangleIcon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {title}
              </h2>
              <p className="text-sm text-gray-600">
                {message}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${styles.button}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
