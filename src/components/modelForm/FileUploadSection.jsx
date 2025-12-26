'use client'
import { formatFileSize } from '@/lib/utils'

/**
 * Компонент для загрузки ZIP-файла модели
 */
export default function FileUploadSection({
  currentFile = null,
  newFile = null,
  onFileChange,
  disabled = false,
  label = 'ZIP-архив модели'
}) {
  return (
    <div className="mb-8">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">{label}</div>
      
      {currentFile && (
        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Текущий файл: {typeof currentFile === 'string' ? currentFile.split('/').pop() : currentFile.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <label className={`inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}>
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {currentFile ? 'Заменить ZIP-файл' : 'Выберите ZIP-файл'}
          <input
            type="file"
            accept=".zip"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const fileName = file.name.toLowerCase()
                if (!fileName.endsWith('.zip')) {
                  alert('Можно загружать только .zip файлы!')
                  e.target.value = ''
                  return
                }
                onFileChange(file)
              }
            }}
            className="sr-only"
            disabled={disabled}
          />
        </label>
        {newFile && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Новый файл: {newFile.name} ({formatFileSize(newFile.size)})
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

