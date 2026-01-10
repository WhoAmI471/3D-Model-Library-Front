import { ApiError } from './apiClient'
import { ERROR_MESSAGES, getErrorMessageByStatus, getFriendlyErrorMessage } from './errorMessages'

/**
 * Форматирует ошибку API в понятное сообщение
 */
export function formatApiError(error) {
  if (!error) {
    return {
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      type: 'unknown',
      status: 0,
      details: null
    }
  }

  // Если это ApiError из apiClient
  if (error instanceof ApiError) {
    return {
      message: error.message || getErrorMessageByStatus(error.status) || ERROR_MESSAGES.UNKNOWN_ERROR,
      type: 'api',
      status: error.status || 0,
      details: error.data || null,
      originalError: error
    }
  }

  // Если это обычный Error
  if (error instanceof Error) {
    return {
      message: getFriendlyErrorMessage(error),
      type: 'error',
      status: 0,
      details: null,
      originalError: error
    }
  }

  // Если это объект с полями
  if (typeof error === 'object') {
    return {
      message: getFriendlyErrorMessage(error),
      type: 'object',
      status: error.status || 0,
      details: error,
      originalError: error
    }
  }

  // Если это строка
  return {
    message: typeof error === 'string' ? error : ERROR_MESSAGES.UNKNOWN_ERROR,
    type: 'string',
    status: 0,
    details: null
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

  // Проверяем наличие интернета
  if (!navigator.onLine) {
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
  if (!error) {
    return formatApiError(null)
  }

  // Проверяем тип ошибки
  if (error instanceof ApiError) {
    return formatApiError(error)
  }

  // Сетевые ошибки
  if (error.name === 'TypeError' && error.message?.includes('fetch')) {
    return formatNetworkError(error)
  }

  // Ошибки валидации (Zod или объект с полями)
  if (error?.issues || (typeof error === 'object' && !error.message && !error.status)) {
    return formatValidationError(error)
  }

  // Обычные ошибки API
  return formatApiError(error)
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
  const formatted = formatError(error)
  
  // Логируем в консоль в режиме разработки
  if (process.env.NODE_ENV === 'development') {
    console.error('Error handled:', {
      formatted,
      original: error,
      context
    })
  }

  // Опционально отправляем на сервер для логирования
  await logErrorToServer(error, context)

  return formatted
}
