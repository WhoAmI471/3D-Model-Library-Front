'use client'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

/**
 * Компонент для кнопок действий формы (Назад, Сохранить, Отмена)
 */
export default function FormActions({ 
  onCancel, 
  onSubmit, 
  isSubmitting = false, 
  submitLabel = 'Сохранить',
  showBackButton = true 
}) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-between pt-6 border-t border-gray-200">
      {showBackButton && (
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Назад
        </button>
      )}
      
      <div className="flex gap-3 ml-auto">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            disabled={isSubmitting}
          >
            Отмена
          </button>
        )}
        <button
          type="submit"
          onClick={onSubmit}
          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
          }`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Сохранение...
            </span>
          ) : submitLabel}
        </button>
      </div>
    </div>
  )
}

