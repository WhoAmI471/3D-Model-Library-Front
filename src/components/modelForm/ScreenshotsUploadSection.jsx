'use client'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useNotification } from '@/hooks/useNotification'

/**
 * Компонент для загрузки и управления скриншотами при создании модели
 */
export default function ScreenshotsUploadSection({
  screenshots = [],
  onAdd,
  onRemove,
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  disabled = false
}) {
  const { error: showError } = useNotification()
  const isValidImageFile = (file) => {
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!validMimeTypes.includes(file.type.toLowerCase())) {
      return false
    }
    
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    
    return hasValidExtension
  }

  const handleFileAdd = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      const MAX_SCREENSHOTS = 8
      const currentCount = screenshots.length
      
      // Проверяем, не превышен ли лимит
      if (currentCount >= MAX_SCREENSHOTS) {
        showError(`Максимальное количество скриншотов: ${MAX_SCREENSHOTS}`)
        e.target.value = ''
        return
      }
      
      const validFiles = []
      const invalidFiles = []
      const oversizedFiles = []
      const MAX_FILE_SIZE = 700 * 1024 // 700 кБ в байтах
      
      files.forEach(file => {
        if (!isValidImageFile(file)) {
          invalidFiles.push(file.name)
        } else if (file.size > MAX_FILE_SIZE) {
          oversizedFiles.push(file.name)
        } else {
          validFiles.push(file)
        }
      })
      
      if (invalidFiles.length > 0) {
        showError(`Следующие файлы не являются изображениями и не будут добавлены: ${invalidFiles.join(', ')}. Разрешены только изображения: JPG, PNG, GIF, WEBP, BMP`)
      }
      
      if (oversizedFiles.length > 0) {
        showError(`Следующие файлы превышают максимальный размер 700 кБ и не будут добавлены: ${oversizedFiles.join(', ')}`)
      }
      
      if (validFiles.length > 0) {
        // Ограничиваем количество добавляемых файлов до лимита
        const availableSlots = MAX_SCREENSHOTS - currentCount
        const filesToAdd = validFiles.slice(0, availableSlots)
        
        if (validFiles.length > availableSlots) {
          showError(`Можно добавить только ${availableSlots} скриншот(ов). Максимальное количество: ${MAX_SCREENSHOTS}`)
        }
        
        onAdd(filesToAdd.map(file => ({
          file,
          preview: URL.createObjectURL(file)
        })))
      }
      
      e.target.value = ''
    }
  }

  return (
    <div className="mb-8">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Скриншоты <span className="text-red-500">*</span>
      </label>
      {screenshots.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-2">
            Первый скриншот будет отображаться в карточке модели. Перетаскивайте скриншоты для изменения порядка.
          </div>
        </div>
      )}
      
      {screenshots.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-2 mb-4">
          {screenshots.map((screenshot, index) => (
            <div
              key={index}
              draggable={!disabled}
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, index)}
              className={`relative flex-shrink-0 w-64 h-48 cursor-move bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-all group ${
                draggedIndex === index ? 'opacity-50 scale-95' : ''
              } ${
                dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-500 scale-105' : ''
              } ${index === 0 ? 'ring-2 ring-blue-500' : ''}`}
            >
              <img
                src={screenshot.preview}
                alt={`Скриншот ${index + 1}`}
                className="object-cover w-full h-full pointer-events-none"
                draggable={false}
              />
              {index === 0 && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                  Главный
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(index)
                }}
                className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors z-10 cursor-pointer"
                disabled={disabled}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs font-medium rounded">
                {index + 1} / {screenshots.length}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Кнопка добавления скриншотов */}
      <div>
        <label className={`inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors ${
          disabled || screenshots.length >= 8 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}>
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Добавить скриншоты
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileAdd}
            className="sr-only"
            disabled={disabled || screenshots.length >= 8}
          />
        </label>
        {screenshots.length < 2 && (
          <p className="mt-2 text-sm text-gray-500">
            Минимум 2 скриншота (сейчас: {screenshots.length})
          </p>
        )}
        {screenshots.length >= 8 && (
          <p className="mt-2 text-sm text-gray-500">
            Максимальное количество скриншотов достигнуто (8)
          </p>
        )}
      </div>
    </div>
  )
}

