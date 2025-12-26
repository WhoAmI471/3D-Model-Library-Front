'use client'
import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export default function DeleteReasonModal({ isOpen, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [mouseDownTarget, setMouseDownTarget] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      setError('Пожалуйста, укажите причину удаления')
      return
    }

    onConfirm(reason.trim())
    setReason('')
    setError('')
  }

  const handleCancel = () => {
    setReason('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  const handleOverlayMouseDown = (e) => {
    setMouseDownTarget(e.target)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
      handleCancel()
    }
    setMouseDownTarget(null)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              Указать причину удаления
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Причина удаления
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError('')
              }}
              className={`block w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={4}
              placeholder="Укажите причину удаления модели..."
              maxLength={500}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              Отправить запрос
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

