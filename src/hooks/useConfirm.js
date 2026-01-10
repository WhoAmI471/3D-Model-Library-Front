'use client'
import { useState, useCallback, useRef } from 'react'

/**
 * Хук для управления модальным окном подтверждения
 * Использование:
 *   const { isOpen, message, title, confirmText, cancelText, variant, showConfirm, handleConfirm, handleCancel } = useConfirm()
 *   
 *   const handleDelete = async () => {
 *     const confirmed = await showConfirm({
 *       message: 'Вы уверены, что хотите удалить этот проект?',
 *       variant: 'danger'
 *     })
 *     if (confirmed) {
 *       // Выполнить действие
 *     }
 *   }
 * 
 * @returns {Object} Объект с состоянием и функциями для подтверждения
 */
export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('Вы уверены, что хотите выполнить это действие?')
  const [title, setTitle] = useState('Подтвердите действие')
  const [confirmText, setConfirmText] = useState('Подтвердить')
  const [cancelText, setCancelText] = useState('Отмена')
  const [variant, setVariant] = useState('danger')
  const resolveRef = useRef(null)

  const showConfirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setMessage(options.message || 'Вы уверены, что хотите выполнить это действие?')
      setTitle(options.title || 'Подтвердите действие')
      setConfirmText(options.confirmText || 'Подтвердить')
      setCancelText(options.cancelText || 'Отмена')
      setVariant(options.variant || 'danger')
      resolveRef.current = resolve
      setIsOpen(true)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setIsOpen(false)
    if (resolveRef.current) {
      resolveRef.current(true)
      resolveRef.current = null
    }
  }, [])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    if (resolveRef.current) {
      resolveRef.current(false)
      resolveRef.current = null
    }
  }, [])

  return {
    isOpen,
    message,
    title,
    confirmText,
    cancelText,
    variant,
    showConfirm,
    handleConfirm,
    handleCancel
  }
}
