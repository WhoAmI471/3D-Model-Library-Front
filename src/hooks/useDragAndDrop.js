'use client'
import { useState } from 'react'

/**
 * Хук для управления drag-and-drop функциональностью
 * Используется для перетаскивания элементов списка (например, скриншотов)
 * 
 * @param {Array} items - Массив элементов
 * @param {Function} onReorder - Callback функция, вызываемая при изменении порядка
 * @returns {Object} Объект с состоянием и обработчиками drag-and-drop
 */
export function useDragAndDrop(items, onReorder) {
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    // Создаем новый массив с измененным порядком
    const newItems = [...items]
    const draggedItem = newItems[draggedIndex]
    
    // Удаляем элемент из старой позиции
    newItems.splice(draggedIndex, 1)
    
    // Вставляем элемент в новую позицию
    newItems.splice(dropIndex, 0, draggedItem)

    // Вызываем callback с новым порядком
    if (onReorder) {
      onReorder(newItems)
    }

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    isDragging: draggedIndex !== null
  }
}

