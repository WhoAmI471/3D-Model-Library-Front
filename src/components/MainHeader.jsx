'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

export default function MainHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [modelTitle, setModelTitle] = useState(null)

  // Получаем название модели, если мы на странице конкретной модели или редактирования
  useEffect(() => {
    // Проверяем страницу просмотра модели: /dashboard/models/[id]
    const modelIdMatch = pathname?.match(/^\/dashboard\/models\/([^\/]+)$/)
    // Проверяем страницу редактирования: /dashboard/models/update/[id]
    const updateIdMatch = pathname?.match(/^\/dashboard\/models\/update\/([^\/]+)$/)
    
    const modelId = modelIdMatch?.[1] || updateIdMatch?.[1]
    
    if (modelId) {
      axios.get(`/api/models/${modelId}`)
        .then(res => {
          setModelTitle(res.data.title)
        })
        .catch(() => {
          setModelTitle(null)
        })
    } else {
      setModelTitle(null)
    }
  }, [pathname])

  const getSectionParts = () => {
    if (pathname === '/dashboard/models/upload') {
      return ['Модели', 'Добавление новой модели']
    }
    
    const isUpdatePage = pathname?.includes('/models/update/')
    
    // Если есть название модели и мы на странице редактирования
    if (modelTitle && isUpdatePage) {
      return ['Модели', modelTitle, 'Редактирование модели']
    }
    
    // Если есть название модели, возвращаем массив ["Модели", "название"]
    if (modelTitle) return ['Модели', modelTitle]
    
    if (pathname === '/dashboard') return ['Модели']
    if (pathname === '/dashboard/projects') return ['Проекты']
    if (pathname === '/dashboard/spheres') return ['Сферы']
    if (pathname === '/dashboard/employees') return ['Сотрудники']
    if (pathname === '/dashboard/logs') return ['Логи']
    if (pathname === '/dashboard/deletion-requests') return ['Удаление моделей']
    if (pathname?.startsWith('/dashboard/models')) return ['Модели']
    if (pathname?.startsWith('/dashboard/projects')) return ['Проекты']
    return []
  }

  const loadUser = async () => {
    try {
      const userRes = await axios.get('/api/auth/me')
      setUser(userRes.data.user)
    } catch (err) {
      router.push('/login')
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  const handleLogout = async () => {
    await axios.post('/api/auth/logout')
    setUser(null)
    router.push('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200">
      <div className="h-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Логотип и активный раздел */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg font-semibold text-gray-900 flex-shrink-0">3D-Library</span>
          {getSectionParts().map((part, index) => (
            <React.Fragment key={index}>
              <span className="text-gray-300 flex-shrink-0">|</span>
              <span className="text-sm font-medium text-gray-600 truncate">{part}</span>
            </React.Fragment>
          ))}
        </div>

        {/* Пользователь и выход */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role?.toLowerCase()}</p>
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