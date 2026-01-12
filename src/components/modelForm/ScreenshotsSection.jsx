'use client'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { proxyUrl } from '@/lib/utils'
import { useNotification } from '@/hooks/useNotification'

/**
 * Компонент для управления скриншотами при редактировании модели
 * Работает с существующими скриншотами (URL) и новыми (File объекты)
 */
export default function ScreenshotsSection({
  currentScreenshots = [],
  newScreenshots = [],
  deletedScreenshots = [],
  onRemoveCurrent,
  onRemoveNew,
  onAdd,
  onRestoreDeleted,
  draggedIndex,
  dragOverIndex,
  draggedType,
  onCurrentDragStart,
  onCurrentDragOver,
  onCurrentDragLeave,
  onCurrentDrop,
  onNewDragStart,
  onNewDragOver,
  onNewDragLeave,
  onNewDrop,
  canEditModel = false,
  canEditScreenshots = false,
  disabled = false
}) {
  const { error: showError } = useNotification()
  // Убеждаемся, что массивы существуют
  const currentScreenshotsArray = Array.isArray(currentScreenshots) ? currentScreenshots : []
  const newScreenshotsArray = Array.isArray(newScreenshots) ? newScreenshots : []
  const totalLength = currentScreenshotsArray.length + newScreenshotsArray.length
  
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
      const validFiles = []
      const invalidFiles = []
      
      files.forEach(file => {
        if (isValidImageFile(file)) {
          validFiles.push(file)
        } else {
          invalidFiles.push(file.name)
        }
      })
      
      if (invalidFiles.length > 0) {
        showError(`Следующие файлы не являются изображениями и не будут добавлены: ${invalidFiles.join(', ')}. Разрешены только изображения: JPG, PNG, GIF, WEBP, BMP`)
      }
      
      if (validFiles.length > 0) {
        onAdd(validFiles)
      }
      
      e.target.value = ''
    }
  }

  const canEdit = canEditModel || canEditScreenshots

  return (
    <div className="col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Текущие скриншоты
      </label>
      {(currentScreenshotsArray.length > 0 || newScreenshotsArray.length > 0) && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-2">
            Первый скриншот будет отображаться в карточке модели. Перетаскивайте скриншоты для изменения порядка.
          </div>
        </div>
      )}
      
      <div className="flex gap-4 overflow-x-auto pb-2">
        {/* Существующие скриншоты */}
        {currentScreenshotsArray.map((file, index) => {
          const totalIndex = index
          // Обеспечиваем, что file - это строка (URL)
          const fileUrl = typeof file === 'string' ? file : (file?.originalUrl || file?.url || file || '')
          return (
            <div
              key={index}
              draggable={canEdit && !disabled}
              onDragStart={() => onCurrentDragStart(index)}
              onDragOver={(e) => onCurrentDragOver(e, index)}
              onDragLeave={onCurrentDragLeave}
              onDrop={(e) => onCurrentDrop(e, index)}
              className={`relative flex-shrink-0 w-64 h-48 cursor-move bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-all group ${
                draggedType === 'current' && draggedIndex === index ? 'opacity-50 scale-95' : ''
              } ${
                draggedType === 'current' && dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-500 scale-105' : ''
              } ${index === 0 ? 'ring-2 ring-blue-500' : ''}`}
            >
              <img
                src={proxyUrl(fileUrl)}
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
                  onRemoveCurrent(index)
                }}
                className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors z-10 cursor-pointer"
                disabled={!canEdit || disabled}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs font-medium rounded">
                {totalIndex + 1} / {totalLength}
              </div>
            </div>
          )
        })}
        
        {/* Новые скриншоты */}
        {newScreenshotsArray.map((file, index) => {
          const totalIndex = currentScreenshotsArray.length + index
          const isFirst = currentScreenshotsArray.length === 0 && index === 0
          // Поддержка как File объектов, так и объектов с {preview, file}
          const previewUrl = file instanceof File 
            ? URL.createObjectURL(file)
            : (file?.preview || (file?.file ? URL.createObjectURL(file.file) : ''))
          return (
            <div
              key={`new-${index}`}
              draggable={canEdit && !disabled}
              onDragStart={() => onNewDragStart(index)}
              onDragOver={(e) => onNewDragOver(e, index)}
              onDragLeave={onNewDragLeave}
              onDrop={(e) => onNewDrop(e, index)}
              className={`relative flex-shrink-0 w-64 h-48 cursor-move bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-all group ${
                draggedType === 'new' && draggedIndex === index ? 'opacity-50 scale-95' : ''
              } ${
                draggedType === 'new' && dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-500 scale-105' : ''
              } ${isFirst ? 'ring-2 ring-blue-500' : ''}`}
            >
              <img
                src={previewUrl}
                alt={`Новый скриншот ${index + 1}`}
                className="object-cover w-full h-full pointer-events-none"
                draggable={false}
              />
              {isFirst && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                  Главный
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveNew(index)
                }}
                className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors z-10 cursor-pointer"
                disabled={disabled}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs font-medium rounded">
                {totalIndex + 1} / {totalLength}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Кнопка добавления скриншотов */}
      <div className="mt-4">
        <label className={`inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors ${
          (!canEdit || disabled) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
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
            disabled={!canEdit || disabled}
          />
        </label>
      </div>
      
      {/* Удаленные скриншоты (можно восстановить) */}
      {Array.isArray(deletedScreenshots) && deletedScreenshots.length > 0 && (
        <div className="mt-8">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Удаленные скриншоты (можно восстановить)</div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {deletedScreenshots.map((deletedUrl, index) => {
              const url = typeof deletedUrl === 'string' ? deletedUrl : (deletedUrl?.originalUrl || deletedUrl?.url || deletedUrl || '')
              return (
              <div key={`deleted-${url || index}`} className="relative flex-shrink-0 w-64 h-48 bg-gray-100 rounded-lg overflow-hidden opacity-60 border-2 border-red-300">
                <img
                  src={proxyUrl(url)}
                  alt={`Удаленный скриншот ${index + 1}`}
                  className="object-cover w-full h-full"
                />
                <button
                  type="button"
                  onClick={() => onRestoreDeleted && onRestoreDeleted(url)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-green-50 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  title="Восстановить скриншот"
                  disabled={disabled}
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

