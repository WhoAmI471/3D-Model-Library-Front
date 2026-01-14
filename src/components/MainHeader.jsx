'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import apiClient from '@/lib/apiClient'
import { handleError } from '@/lib/errorHandler'
import NotificationContainer from '@/components/NotificationContainer'

export default function MainHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [user, setUser] = useState(null)
  const [modelTitle, setModelTitle] = useState(null)
  const [projectTitle, setProjectTitle] = useState(null)
  const [sphereTitle, setSphereTitle] = useState(null)

  // Получаем название модели или проекта, если мы на странице конкретной модели/проекта
  useEffect(() => {
    // Пропускаем специальные страницы
    if (pathname === '/dashboard/models/upload') {
      setModelTitle(null)
      // Проверяем, есть ли sphereId в query параметрах
      const sphereId = searchParams?.get('sphereId')
      if (sphereId) {
        apiClient.spheres.getById(sphereId)
          .then(data => {
            if (data && typeof data === 'object' && data.name) {
              setSphereTitle(data.name)
            } else {
              setSphereTitle(null)
            }
          })
          .catch((error) => {
            if (error?.status && error.status !== 404) {
              console.warn('Ошибка загрузки названия сферы:', error?.message || 'Unknown error')
            }
            setSphereTitle(null)
          })
        setProjectTitle(null)
        return
      }
      // Проверяем, есть ли projectId в query параметрах
      const projectId = searchParams?.get('projectId')
      if (projectId) {
        apiClient.projects.getById(projectId)
          .then(data => {
            if (data && typeof data === 'object' && data.name) {
              setProjectTitle(data.name)
            } else {
              setProjectTitle(null)
            }
          })
          .catch((error) => {
            if (error?.status && error.status !== 404) {
              console.warn('Ошибка загрузки названия проекта:', error?.message || 'Unknown error')
            }
            setProjectTitle(null)
          })
        setSphereTitle(null)
      } else {
        setProjectTitle(null)
        setSphereTitle(null)
      }
      return
    }
    
    // Проверяем страницу просмотра проекта: /dashboard/projects/[id]
    const projectIdMatch = pathname?.match(/^\/dashboard\/projects\/([^\/]+)$/)
    const projectId = projectIdMatch?.[1]
    
    if (projectId) {
      apiClient.projects.getById(projectId)
        .then(data => {
          if (data && typeof data === 'object' && data.name) {
            setProjectTitle(data.name)
          } else {
            setProjectTitle(null)
          }
        })
        .catch((error) => {
          if (error?.status && error.status !== 404) {
            console.warn('Ошибка загрузки названия проекта:', error?.message || 'Unknown error')
          }
          setProjectTitle(null)
        })
      setModelTitle(null)
      setSphereTitle(null)
      return
    }
    
    // Проверяем страницу просмотра сферы: /dashboard/spheres/[id]
    const sphereIdMatch = pathname?.match(/^\/dashboard\/spheres\/([^\/]+)$/)
    const sphereId = sphereIdMatch?.[1]
    
    if (sphereId) {
      apiClient.spheres.getById(sphereId)
        .then(data => {
          if (data && typeof data === 'object' && data.name) {
            setSphereTitle(data.name)
          } else {
            setSphereTitle(null)
          }
        })
        .catch((error) => {
          if (error?.status && error.status !== 404) {
            console.warn('Ошибка загрузки названия сферы:', error?.message || 'Unknown error')
          }
          setSphereTitle(null)
        })
      setModelTitle(null)
      setProjectTitle(null)
      return
    }
    
    // Проверяем страницу просмотра модели: /dashboard/models/[id] (но не upload, update и т.д.)
    const modelIdMatch = pathname?.match(/^\/dashboard\/models\/([^\/]+)$/)
    // Проверяем страницу редактирования: /dashboard/models/update/[id]
    const updateIdMatch = pathname?.match(/^\/dashboard\/models\/update\/([^\/]+)$/)
    
    const modelId = modelIdMatch?.[1] || updateIdMatch?.[1]
    
    // Проверяем, что это не специальные маршруты
    if (modelId && modelId !== 'upload' && modelId !== 'update') {
      apiClient.models.getById(modelId)
        .then(data => {
          if (data && typeof data === 'object' && data.title) {
            setModelTitle(data.title)
          } else {
            setModelTitle(null)
          }
        })
        .catch((error) => {
          // Тихая обработка ошибки - если модель не найдена, просто не показываем название
          // Не логируем ошибки 404 и другие некритичные ошибки в консоль
          if (error?.status && error.status !== 404) {
            // Только логируем критичные ошибки (не 404)
            console.warn('Ошибка загрузки названия модели:', error?.message || 'Unknown error')
          }
          setModelTitle(null)
        })
    } else {
      setModelTitle(null)
    }
    setProjectTitle(null)
    setSphereTitle(null)
  }, [pathname, searchParams])

  const getSectionParts = () => {
    if (pathname === '/dashboard/models/upload') {
      // Если есть название сферы, показываем путь со сферой
      if (sphereTitle) {
        return ['Сферы', sphereTitle, 'Добавление новой модели']
      }
      // Если есть название проекта, показываем путь с проектом
      if (projectTitle) {
        return ['Проекты', projectTitle, 'Добавление новой модели']
      }
      return ['Модели', 'Добавление новой модели']
    }
    
    const isUpdatePage = pathname?.includes('/models/update/')
    
    // Если есть название модели и мы на странице редактирования
    if (modelTitle && isUpdatePage) {
      return ['Модели', modelTitle, 'Редактирование модели']
    }
    
    // Если есть название модели, возвращаем массив ["Модели", "название"]
    if (modelTitle) return ['Модели', modelTitle]
    
    // Если есть название проекта, возвращаем массив ["Проекты", "название"]
    if (projectTitle) return ['Проекты', projectTitle]
    
    // Если есть название сферы, возвращаем массив ["Сферы", "название"]
    if (sphereTitle) return ['Сферы', sphereTitle]
    
    if (pathname === '/dashboard') return ['Модели']
    if (pathname === '/dashboard/projects') return ['Проекты']
    if (pathname === '/dashboard/spheres') return ['Сферы']
    if (pathname === '/dashboard/employees') return ['Сотрудники']
    if (pathname === '/dashboard/logs') return ['Журнал событий']
    if (pathname === '/dashboard/deletion-requests') return ['Удаление моделей']
    if (pathname?.startsWith('/dashboard/deleted-models')) return ['История удаленных моделей']
    if (pathname?.startsWith('/dashboard/models')) return ['Модели']
    if (pathname?.startsWith('/dashboard/projects')) return ['Проекты']
    return []
  }

  const loadUser = async () => {
    try {
      const data = await apiClient.auth.me()
      setUser(data.user)
    } catch (err) {
      await handleError(err, { context: 'MainHeader.loadUser' })
      router.push('/login')
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  const handleLogout = async () => {
    await apiClient.auth.logout()
    setUser(null)
    router.push('/login')
  }

  const getRoleName = (role) => {
    const roleMap = {
      'ADMIN': 'Администратор',
      'ARTIST': 'Художник',
      'ANALYST': 'Аналитик',
      'MANAGER': 'Менеджер',
      'PROGRAMMER': 'Программист'
    }
    return roleMap[role] || role?.toLowerCase() || ''
  }

  const truncateText = (text, maxLength = 25) => {
    if (!text || text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200">
      <div className="h-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Логотип и активный раздел */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard" className="flex-shrink-0 cursor-pointer">
            <img 
              src="/Logo-3D-libary.svg" 
              alt="3D Library" 
              className="h-6 w-auto"
            />
          </Link>
          {getSectionParts().map((part, index) => (
            <React.Fragment key={index}>
              <span className="text-gray-300 flex-shrink-0">|</span>
              <span className="text-sm font-medium text-gray-600 truncate" title={part}>{truncateText(part, 25)}</span>
            </React.Fragment>
          ))}
        </div>

        {/* Пользователь и выход */}
        {user && (
          <div className="flex items-center gap-4 relative">
            {/* Контейнер уведомлений - слева от имени пользователя, сверху */}
            <NotificationContainer position="header" />
            
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{getRoleName(user.role)}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Выйти"
            >
              <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}