import { ApiError } from './apiClient'
import { ERROR_MESSAGES, getErrorMessageByStatus, getFriendlyErrorMessage } from './errorMessages'

/**
 * Форматирует ошибку API в понятное сообщение
 */
export function formatApiError(error) {
  // Проверяем на null, undefined и пустой объект
  if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
    return {
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      type: 'unknown',
      status: 0,
      details: null
    }
  }

  try {
    // Если это ApiError из apiClient
    if (error instanceof ApiError) {
      const message = error.message || getErrorMessageByStatus(error.status) || ERROR_MESSAGES.UNKNOWN_ERROR
      return {
        message: String(message || ERROR_MESSAGES.UNKNOWN_ERROR),
        type: 'api',
        status: Number(error.status || 0),
        details: error.data || null,
        originalError: error
      }
    }

    // Если это обычный Error
    if (error instanceof Error) {
      const message = getFriendlyErrorMessage(error) || ERROR_MESSAGES.UNKNOWN_ERROR
      return {
        message: String(message),
        type: 'error',
        status: 0,
        details: null,
        originalError: error
      }
    }

    // Если это объект с полями
    if (typeof error === 'object') {
      const message = getFriendlyErrorMessage(error) || ERROR_MESSAGES.UNKNOWN_ERROR
      return {
        message: String(message),
        type: 'object',
        status: Number(error.status || 0),
        details: error,
        originalError: error
      }
    }

    // Если это строка
    if (typeof error === 'string') {
      return {
        message: String(error || ERROR_MESSAGES.UNKNOWN_ERROR),
        type: 'string',
        status: 0,
        details: null
      }
    }

    // Для всех остальных случаев
    return {
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      type: 'unknown',
      status: 0,
      details: null
    }
  } catch (e) {
    // Если форматирование вызвало ошибку, возвращаем базовый объект
    return {
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      type: 'unknown',
      status: 0,
      details: null
    }
  }
}

/**
 * Форматирует ошибку валидации
 */
export function formatValidationError(error) {
  if (!error) {
    return {
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      type: 'validation',
      fields: {}
    }
  }

  // Если это ошибка из react-hook-form
  if (error?.issues && Array.isArray(error.issues)) {
    // Zod ошибка
    const fields = {}
    error.issues.forEach(issue => {
      const path = issue.path.join('.')
      fields[path] = issue.message
    })

    return {
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      type: 'validation',
      fields,
      originalError: error
    }
  }

  // Если это объект с полями ошибок
  if (typeof error === 'object' && !error.message) {
    return {
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      type: 'validation',
      fields: error,
      originalError: error
    }
  }

  // Обычная ошибка валидации
  return {
    message: getFriendlyErrorMessage(error, ERROR_MESSAGES.VALIDATION_ERROR),
    type: 'validation',
    fields: {},
    originalError: error
  }
}

/**
 * Форматирует сетевую ошибку
 */
export function formatNetworkError(error) {
  if (!error) {
    return {
      message: ERROR_MESSAGES.NETWORK_ERROR,
      type: 'network'
    }
  }

  // Проверяем наличие интернета (только в браузере)
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      message: ERROR_MESSAGES.NETWORK_OFFLINE,
      type: 'network',
      code: 'OFFLINE'
    }
  }

  // Ошибка подключения
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return {
      message: ERROR_MESSAGES.NETWORK_ERROR,
      type: 'network',
      code: 'CONNECTION_FAILED',
      originalError: error
    }
  }

  // Таймаут
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return {
      message: ERROR_MESSAGES.NETWORK_TIMEOUT,
      type: 'network',
      code: 'TIMEOUT',
      originalError: error
    }
  }

  return {
    message: getFriendlyErrorMessage(error, ERROR_MESSAGES.NETWORK_ERROR),
    type: 'network',
    code: 'UNKNOWN',
    originalError: error
  }
}

/**
 * Универсальная функция форматирования ошибки
 * Автоматически определяет тип ошибки и форматирует её
 */
export function formatError(error) {
  try {
    // Если ошибка null, undefined или пустая
    if (!error) {
      return formatApiError(null)
    }

    // Проверяем, что ApiError доступен (может быть проблема с импортом)
    try {
      if (error instanceof ApiError) {
        return formatApiError(error)
      }
    } catch (e) {
      // Если ApiError не доступен, продолжаем дальше
    }

    // Если это Error объект
    if (error instanceof Error) {
      // Сетевые ошибки
      if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        return formatNetworkError(error)
      }
      // Обычные ошибки
      return formatApiError(error)
    }

    // Если это объект
    if (typeof error === 'object') {
      // Ошибки валидации (Zod или объект с полями)
      if (error.issues && Array.isArray(error.issues)) {
        return formatValidationError(error)
      }
      
      // Объекты без message и status - возможная ошибка валидации
      if (!error.message && !error.status && !error.error) {
        return formatValidationError(error)
      }
      
      // Обычные объекты ошибок
      return formatApiError(error)
    }

    // Если это строка
    if (typeof error === 'string') {
      return formatApiError(error)
    }

    // Для всех остальных случаев
    return formatApiError(null)
  } catch (formatErr) {
    // Если форматирование вызвало ошибку, возвращаем базовый объект
    return {
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      type: 'unknown',
      status: 0,
      details: null
    }
  }
}

/**
 * Получить сообщение об ошибке для отображения пользователю
 */
export function getErrorMessage(error) {
  const formatted = formatError(error)
  return formatted.message || ERROR_MESSAGES.UNKNOWN_ERROR
}

/**
 * Логирование ошибки на сервер (опционально)
 */
export async function logErrorToServer(error, context = {}) {
  try {
    // Опциональная отправка ошибок на сервер для логирования
    // Раскомментировать при необходимости
    /*
    await fetch('/api/logs/error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        error: formatError(error),
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    })
    */
  } catch (logError) {
    // Игнорируем ошибки логирования, чтобы не создавать бесконечный цикл
    console.error('Failed to log error to server:', logError)
  }
}

/**
 * Обработка ошибки с логированием
 */
export async function handleError(error, context = {}) {
  try {
    const formatted = formatError(error)
    
    // Проверяем, что formatted корректный объект с message
    if (!formatted || typeof formatted !== 'object' || !formatted.message) {
      // Если formatted некорректен, создаем новый
      const safeFormatted = {
        message: ERROR_MESSAGES.UNKNOWN_ERROR,
        type: 'unknown',
        status: 0,
        details: null
      }
      
      // Логируем в режиме разработки
      if (process.env.NODE_ENV === 'development') {
        try {
          console.error('Error handled: Invalid formatted error, using fallback', {
            message: safeFormatted.message,
            originalErrorType: typeof error,
            context: typeof context === 'object' ? JSON.stringify(context) : context
          })
        } catch (e) {
          // Игнорируем ошибки логирования
        }
      }
      
      return safeFormatted
    }
    
    // Логируем в консоль в режиме разработки (безопасное логирование)
    if (process.env.NODE_ENV === 'development') {
      try {
        // Создаем безопасный объект для логирования без циклических ссылок
        const logData = {
          message: String(formatted.message || 'Unknown error'),
          type: String(formatted.type || 'unknown'),
          status: Number(formatted.status || 0),
          errorName: error && typeof error === 'object' ? String(error.name || 'N/A') : 'N/A',
          errorMessage: error && typeof error === 'object' ? String(error.message || 'N/A') : 'N/A',
          contextKeys: context && typeof context === 'object' ? Object.keys(context) : []
        }
        console.error('Error handled:', logData)
      } catch (logErr) {
        // Если не удалось залогировать, просто выводим базовое сообщение
        try {
          console.error('Error handled: Failed to log error details')
        } catch (e) {
          // Игнорируем даже ошибки простого логирования
        }
      }
    }

    // Опционально отправляем на сервер для логирования
    try {
      await logErrorToServer(error, context)
    } catch (logErr) {
      // Игнорируем ошибки логирования на сервер
    }

    return formatted
  } catch (handlerError) {
    // Если сама обработка ошибки вызвала ошибку, возвращаем базовый объект
    try {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error in handleError:', handlerError?.message || 'Unknown error in error handler')
      }
    } catch (e) {
      // Игнорируем ошибки логирования
    }
    return {
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      type: 'unknown',
      status: 0,
      details: null
    }
  }
}
