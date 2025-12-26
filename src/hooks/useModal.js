'use client'
import { useState } from 'react'

/**
 * Хук для управления состоянием модального окна
 * Обрабатывает логику закрытия при клике вне модального окна
 * 
 * @param {Function} onClose - Функция для закрытия модального окна
 * @returns {Object} Объект с обработчиками событий для overlay
 */
export function useModal(onClose) {
  const [mouseDownTarget, setMouseDownTarget] = useState(null)

  const handleOverlayMouseDown = (e) => {
    setMouseDownTarget(e.target)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
      onClose()
    }
    setMouseDownTarget(null)
  }

  const handleContentMouseDown = (e) => {
    e.stopPropagation()
  }

  const handleContentClick = (e) => {
    e.stopPropagation()
  }

  return {
    handleOverlayMouseDown,
    handleOverlayClick,
    handleContentMouseDown,
    handleContentClick
  }
}

