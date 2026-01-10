/**
 * Централизованные сообщения об ошибках
 */

export const ERROR_MESSAGES = {
  // Сетевые ошибки
  NETWORK_ERROR: 'Ошибка соединения с сервером',
  NETWORK_TIMEOUT: 'Превышено время ожидания ответа от сервера',
  NETWORK_OFFLINE: 'Нет подключения к интернету',

  // Ошибки авторизации
  UNAUTHORIZED: 'Необходима авторизация',
  FORBIDDEN: 'Доступ запрещен',
  SESSION_EXPIRED: 'Сессия истекла. Пожалуйста, войдите снова',
  INVALID_CREDENTIALS: 'Неверные учетные данные',

  // Ошибки валидации
  VALIDATION_ERROR: 'Ошибка валидации данных',
  REQUIRED_FIELD: 'Поле обязательно для заполнения',
  INVALID_EMAIL: 'Некорректный email адрес',
  INVALID_FORMAT: 'Некорректный формат данных',

  // Ошибки файлов
  FILE_TOO_LARGE: 'Файл слишком большой',
  INVALID_FILE_TYPE: 'Неподдерживаемый тип файла',
  FILE_UPLOAD_FAILED: 'Ошибка загрузки файла',
  FILE_NOT_FOUND: 'Файл не найден',

  // Ошибки ресурсов
  NOT_FOUND: 'Ресурс не найден',
  ALREADY_EXISTS: 'Ресурс уже существует',
  DELETE_FAILED: 'Ошибка при удалении',
  UPDATE_FAILED: 'Ошибка при обновлении',
  CREATE_FAILED: 'Ошибка при создании',

  // Общие ошибки
  UNKNOWN_ERROR: 'Произошла неизвестная ошибка',
  SERVER_ERROR: 'Ошибка сервера',
  BAD_REQUEST: 'Некорректный запрос',

  // Специфичные ошибки приложения
  MIN_SCREENSHOTS_REQUIRED: 'Добавьте минимум 2 скриншота',
  MODEL_NOT_FOUND: 'Модель не найдена',
  PROJECT_NOT_FOUND: 'Проект не найден',
  USER_NOT_FOUND: 'Пользователь не найден',
  PERMISSION_DENIED: 'У вас нет прав для выполнения этого действия',
}

/**
 * Получить сообщение об ошибке по статусу HTTP
 */
export function getErrorMessageByStatus(status) {
  switch (status) {
    case 400:
      return ERROR_MESSAGES.BAD_REQUEST
    case 401:
      return ERROR_MESSAGES.UNAUTHORIZED
    case 403:
      return ERROR_MESSAGES.FORBIDDEN
    case 404:
      return ERROR_MESSAGES.NOT_FOUND
    case 408:
      return ERROR_MESSAGES.NETWORK_TIMEOUT
    case 409:
      return ERROR_MESSAGES.ALREADY_EXISTS
    case 413:
      return ERROR_MESSAGES.FILE_TOO_LARGE
    case 422:
      return ERROR_MESSAGES.VALIDATION_ERROR
    case 500:
    case 502:
    case 503:
    case 504:
      return ERROR_MESSAGES.SERVER_ERROR
    default:
      return ERROR_MESSAGES.UNKNOWN_ERROR
  }
}

/**
 * Получить дружелюбное сообщение об ошибке
 */
export function getFriendlyErrorMessage(error, defaultMessage = ERROR_MESSAGES.UNKNOWN_ERROR) {
  if (!error) return defaultMessage

  // Если это строка, возвращаем как есть
  if (typeof error === 'string') return error

  // Если это объект с message
  if (error.message) return error.message

  // Если это объект с error
  if (error.error) return error.error

  return defaultMessage
}
