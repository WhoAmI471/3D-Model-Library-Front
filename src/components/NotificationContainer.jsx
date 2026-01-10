'use client'
import { useNotification } from '@/contexts/NotificationContext'
import Notification from './Notification'

export default function NotificationContainer({ position = 'header' }) {
  const { notifications, removeNotification } = useNotification()

  if (notifications.length === 0) return null

  // Позиционирование для header (слева от имени пользователя, в пределах header)
  if (position === 'header') {
    return (
      <div className="absolute top-0 right-0 flex flex-col gap-2 pointer-events-none z-50 min-w-[280px] max-w-sm transform translate-x-[-75%] translate-y-2 mr-2">
        {notifications.map(notif => (
          <Notification
            key={notif.id}
            id={notif.id}
            message={notif.message}
            type={notif.type}
            duration={notif.duration}
            onClose={removeNotification}
          />
        ))}
      </div>
    )
  }

  // Альтернативное позиционирование (правый верхний угол)
  return (
    <div className="fixed top-20 right-4 sm:right-8 z-50 flex flex-col gap-3 pointer-events-none max-h-[calc(100vh-6rem)] overflow-y-auto">
      {notifications.map(notif => (
        <Notification
          key={notif.id}
          id={notif.id}
          message={notif.message}
          type={notif.type}
          duration={notif.duration}
          onClose={removeNotification}
        />
      ))}
    </div>
  )
}
