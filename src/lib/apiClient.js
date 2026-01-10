/**
 * Единый API клиент для всех запросов к серверу
 * Использует fetch API с автоматической обработкой ошибок и авторизацией
 */

import { getErrorMessageByStatus, ERROR_MESSAGES } from './errorMessages'

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/**
 * Базовый метод для выполнения HTTP запросов
 */
async function request(url, options = {}) {
  const {
    method = 'GET',
    body = null,
    headers = {},
    ...restOptions
  } = options

  // Определяем Content-Type автоматически
  const defaultHeaders = {}
  
  // Если body - FormData, не устанавливаем Content-Type (браузер установит сам с boundary)
  if (body instanceof FormData) {
    // FormData - не устанавливаем Content-Type
  } else if (body && typeof body === 'object') {
    // JSON данные
    defaultHeaders['Content-Type'] = 'application/json'
  }

  const config = {
    method,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    credentials: 'include', // Важно для работы с httpOnly cookies
    ...restOptions,
  }

  // Преобразуем body в JSON, если это объект (не FormData)
  if (body && !(body instanceof FormData)) {
    if (typeof body === 'object') {
      config.body = JSON.stringify(body)
    } else {
      config.body = body
    }
  } else if (body instanceof FormData) {
    config.body = body
  }

  try {
    const response = await fetch(url, config)

    // Парсим JSON ответ, если это возможно
    let data = null
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json()
      } catch (e) {
        // Если не удалось распарсить JSON, оставляем data = null
      }
    }

    // Если ответ не успешный, выбрасываем ошибку
    if (!response.ok) {
      // Используем централизованные сообщения об ошибках
      const errorMessage = data?.error || data?.message || getErrorMessageByStatus(response.status)
      throw new ApiError(errorMessage, response.status, data)
    }

    return { data, response }
  } catch (error) {
    // Если это уже ApiError, пробрасываем дальше
    if (error instanceof ApiError) {
      throw error
    }

    // Обработка сетевых ошибок
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 0, null)
    }

    // Другие ошибки
    throw new ApiError(error.message || ERROR_MESSAGES.UNKNOWN_ERROR, 0, null)
  }
}

/**
 * Специализированные методы для каждого ресурса
 */
const apiClient = {
  // ===== AUTH =====
  auth: {
    async login(email, password) {
      const { data } = await request('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      return data
    },

    async logout() {
      const { data } = await request('/api/auth/logout', {
        method: 'POST',
      })
      return data
    },

    async me() {
      const { data } = await request('/api/auth/me')
      return data
    },
  },

  // ===== MODELS =====
  models: {
    async getAll(params = {}) {
      const queryParams = new URLSearchParams()
      if (params.projectId) queryParams.append('projectId', params.projectId)
      if (params.include) queryParams.append('include', params.include)
      
      const url = queryParams.toString() 
        ? `/api/models?${queryParams.toString()}`
        : '/api/models'
      
      const { data } = await request(url)
      return data
    },

    async getById(id, params = {}) {
      const queryParams = new URLSearchParams()
      if (params.include) queryParams.append('include', params.include)
      
      const url = queryParams.toString()
        ? `/api/models/${id}?${queryParams.toString()}`
        : `/api/models/${id}`
      
      const { data } = await request(url)
      return data
    },

    async create(formData) {
      const { data } = await request('/api/models/upload', {
        method: 'POST',
        body: formData, // FormData для загрузки файлов
      })
      return data
    },

    async update(id, formData) {
      const { data } = await request('/api/models/update', {
        method: 'POST',
        body: formData, // FormData для загрузки файлов
      })
      return data
    },

    async delete(id, approve = true) {
      const { data } = await request(`/api/models/${id}`, {
        method: 'DELETE',
        body: { approve },
      })
      return data
    },

    async requestDeletion(id, comment) {
      const { data } = await request(`/api/models/${id}`, {
        method: 'PUT',
        body: { comment },
      })
      return data
    },
  },

  // ===== PROJECTS =====
  projects: {
    async getAll() {
      const { data } = await request('/api/projects')
      return data
    },

    async getById(id) {
      const { data } = await request(`/api/projects/${id}`)
      return data
    },

    async create(projectData) {
      // Если есть файлы, используем FormData
      if (projectData.imageFile || projectData.deleteImage) {
        const formData = new FormData()
        formData.append('name', projectData.name)
        formData.append('city', projectData.city || '')
        if (projectData.modelIds) {
          projectData.modelIds.forEach(id => formData.append('modelIds', id))
        }
        if (projectData.imageFile) {
          formData.append('image', projectData.imageFile)
        }
        if (projectData.deleteImage) {
          formData.append('deleteImage', 'true')
        }

        const { data } = await request('/api/projects', {
          method: 'POST',
          body: formData,
        })
        return data
      }

      // Иначе используем JSON
      const { data } = await request('/api/projects', {
        method: 'POST',
        body: {
          name: projectData.name,
          city: projectData.city,
          modelIds: projectData.modelIds || [],
        },
      })
      return data
    },

    async update(id, projectData) {
      // Если есть файлы, используем FormData
      if (projectData.imageFile || projectData.deleteImage) {
        const formData = new FormData()
        formData.append('name', projectData.name)
        formData.append('city', projectData.city || '')
        if (projectData.modelIds) {
          projectData.modelIds.forEach(id => formData.append('modelIds', id))
        }
        if (projectData.imageFile) {
          formData.append('image', projectData.imageFile)
        }
        if (projectData.deleteImage) {
          formData.append('deleteImage', 'true')
        }

        const { data } = await request(`/api/projects/${id}`, {
          method: 'PUT',
          body: formData,
        })
        return data
      }

      // Иначе используем JSON
      const { data } = await request(`/api/projects/${id}`, {
        method: 'PUT',
        body: {
          name: projectData.name,
          city: projectData.city,
          modelIds: projectData.modelIds || [],
        },
      })
      return data
    },

    async delete(id) {
      const { data } = await request(`/api/projects/${id}`, {
        method: 'DELETE',
      })
      return data
    },
  },

  // ===== EMPLOYEES =====
  employees: {
    async getAll() {
      const { data } = await request('/api/employees')
      return data
    },

    async getById(id) {
      const { data } = await request(`/api/employees/${id}`)
      return data
    },

    async create(employeeData) {
      const { data } = await request('/api/employees', {
        method: 'POST',
        body: employeeData,
      })
      return data
    },

    async update(id, employeeData) {
      const { data } = await request(`/api/employees/${id}`, {
        method: 'PUT',
        body: employeeData,
      })
      return data
    },

    async delete(id) {
      const { data } = await request(`/api/employees/${id}`, {
        method: 'DELETE',
      })
      return data
    },
  },

  // ===== SPHERES =====
  spheres: {
    async getAll() {
      const { data } = await request('/api/spheres')
      return data
    },

    async getById(id) {
      const { data } = await request(`/api/spheres/${id}`)
      return data
    },

    async create(sphereData) {
      const { data } = await request('/api/spheres', {
        method: 'POST',
        body: sphereData,
      })
      return data
    },

    async update(id, sphereData) {
      const { data } = await request(`/api/spheres/${id}`, {
        method: 'PUT',
        body: sphereData,
      })
      return data
    },

    async delete(id) {
      const { data } = await request(`/api/spheres/${id}`, {
        method: 'DELETE',
      })
      return data
    },
  },

  // ===== USERS =====
  users: {
    async getAll() {
      const { data } = await request('/api/users')
      return data
    },
  },

  // ===== LOGS =====
  logs: {
    async getAll(params = {}) {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page)
      if (params.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder)
      if (params.action) queryParams.append('action', params.action)
      if (params.user) queryParams.append('user', params.user)
      if (params.userId) queryParams.append('userId', params.userId)
      if (params.modelId) queryParams.append('modelId', params.modelId)
      if (params.projectId) queryParams.append('projectId', params.projectId)
      if (params.startDate) queryParams.append('startDate', params.startDate)
      if (params.endDate) queryParams.append('endDate', params.endDate)
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom)
      if (params.dateTo) queryParams.append('dateTo', params.dateTo)
      
      const url = queryParams.toString()
        ? `/api/logs?${queryParams.toString()}`
        : '/api/logs'
      
      const { data } = await request(url)
      return data
    },
  },

  // ===== NEXTCLOUD PROXY =====
  nextcloud: {
    async getFile(path) {
      const { response } = await request(`/api/nextcloud/file?path=${encodeURIComponent(path)}`)
      return response
    },
  },
}

// Экспортируем класс ошибки для использования в компонентах
export { ApiError }

// Экспортируем базовый метод request для особых случаев
export { request }

// Экспортируем основной API клиент
export default apiClient

