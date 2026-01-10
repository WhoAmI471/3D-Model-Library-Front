'use client'
import { useEffect, useState, useRef } from 'react'
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function Notification({ 
  message, 
  type = 'info', 
  onClose, 
  duration = 4000,
  id 
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const hideTimerRef = useRef(null)

  const handleClose = () => {
    setIsExiting(true)
    setIsVisible(false)
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    setTimeout(() => {
      onClose?.(id)
    }, 300) // Ждем завершения анимации
  }

  // Эффект для первоначального появления
  useEffect(() => {
    // Запускаем анимацию появления
    const showTimer = setTimeout(() => {
      setIsVisible(true)
    }, 10)

    return () => {
      clearTimeout(showTimer)
    }
  }, [])

  // Сохраняем onClose в ref для стабильности
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Эффект для автозакрытия - перезапускается при изменении типа или duration
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }

    // Если уведомление видимо, тип не loading и duration > 0, запускаем автозакрытие
    if (isVisible && !isExiting && type !== 'loading' && duration > 0) {
      hideTimerRef.current = setTimeout(() => {
        setIsExiting(true)
        setIsVisible(false)
        setTimeout(() => {
          onCloseRef.current?.(id)
        }, 300)
      }, duration)
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [isVisible, isExiting, type, duration, id])

  // Определяем стили в зависимости от типа
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: 'text-green-600',
          Icon: CheckCircleIcon
        }
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          Icon: ExclamationCircleIcon
        }
      case 'loading':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          Icon: ArrowPathIcon
        }
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          Icon: InformationCircleIcon
        }
    }
  }

  const styles = getStyles()
  const Icon = styles.Icon

  return (
    <div
      className={`
        relative min-w-[280px] max-w-sm
        ${styles.bg} ${styles.border} border rounded-lg shadow-lg p-4
        pointer-events-auto
        transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'opacity-100' : 'opacity-0'}
      `}
      style={{
        transform: isVisible && !isExiting 
          ? 'translateY(0)' 
          : 'translateY(-100%)',
        transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-out'
      }}
    >
      <div className="flex items-start gap-3">
        {type === 'loading' ? (
          <Icon className={`h-6 w-6 ${styles.icon} flex-shrink-0 mt-0.5 animate-spin`} />
        ) : (
          <Icon className={`h-6 w-6 ${styles.icon} flex-shrink-0 mt-0.5`} />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${styles.text} break-words`}>
            {message}
          </p>
        </div>
        {type !== 'loading' && (
          <button
            onClick={handleClose}
            className={`flex-shrink-0 ${styles.text} hover:opacity-70 transition-opacity cursor-pointer p-1 rounded hover:bg-white/50`}
            aria-label="Закрыть"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
