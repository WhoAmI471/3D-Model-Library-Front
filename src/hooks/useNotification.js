'use client'
import { useNotification as useNotificationContext } from '@/contexts/NotificationContext'

/**
 * Хук для работы с глобальными уведомлениями
 * 
 * @example
 * const { success, error, info, loading } = useNotification()
 * 
 * // Показать успешное уведомление
 * success('Модель успешно создана')
 * 
 * // Показать ошибку
 * error('Ошибка при загрузке данных')
 * 
 * // Показать информационное уведомление
 * info('Данные обновлены')
 * 
 * // Показать загрузку (не закрывается автоматически)
 * const loadingId = loading('Загрузка данных...')
 * // Обновить загрузку на успех
 * updateNotification(loadingId, 'Данные загружены', 'success')
 */
export function useNotification() {
  return useNotificationContext()
}

export default useNotification
