'use client'
import { createContext, useContext, useState, useCallback } from 'react'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }, [])

  const addNotification = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    const notification = {
      id,
      message,
      type,
      duration: type === 'loading' ? 0 : duration // loading уведомления не закрываются автоматически
    }
    
    setNotifications(prev => [...prev, notification])
    
    return id
  }, [])

  const success = useCallback((message, duration = 4000) => {
    return addNotification(message, 'success', duration)
  }, [addNotification])

  const error = useCallback((message, duration = 5000) => {
    return addNotification(message, 'error', duration)
  }, [addNotification])

  const info = useCallback((message, duration = 4000) => {
    return addNotification(message, 'info', duration)
  }, [addNotification])

  const loading = useCallback((message) => {
    return addNotification(message, 'loading', 0)
  }, [addNotification])

  const updateNotification = useCallback((id, message, type) => {
    if (!id || (typeof id !== 'number' && typeof id !== 'string')) {
      console.warn('updateNotification: неверный ID уведомления', id)
      return
    }
    
    setNotifications(prev => {
      const exists = prev.some(notif => notif.id === id)
      if (!exists) {
        console.warn('updateNotification: уведомление с ID', id, 'не найдено')
        return prev
      }
      
      // Определяем duration в зависимости от типа
      let newDuration = 4000 // По умолчанию
      if (type === 'loading') {
        newDuration = 0 // loading не закрывается автоматически
      } else if (type === 'error') {
        newDuration = 5000 // ошибки показываются дольше
      } else if (type === 'success' || type === 'info') {
        newDuration = 4000
      }
      
      return prev.map(notif => 
        notif.id === id ? { ...notif, message, type, duration: newDuration } : notif
      )
    })
  }, [])

  const value = {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    info,
    loading,
    updateNotification
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
