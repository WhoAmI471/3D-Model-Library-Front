'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

export default function MainHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)

  const getSectionName = () => {
    if (pathname === '/dashboard') return 'Модели'
    if (pathname === '/dashboard/projects') return 'Проекты'
    if (pathname === '/dashboard/employees') return 'Сотрудники'
    if (pathname === '/dashboard/logs') return 'Логи'
    if (pathname === '/dashboard/deletion-requests') return 'Удаление моделей'
    if (pathname?.startsWith('/dashboard/models')) return 'Модели'
    if (pathname?.startsWith('/dashboard/projects')) return 'Проекты'
    return ''
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
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-gray-900">3D-Library</span>
          {getSectionName() && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-600">{getSectionName()}</span>
            </>
          )}
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
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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