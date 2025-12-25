'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import Logo from "../../public/Logo.svg"
import axios from 'axios'

export default function MainHeader() {
  const router = useRouter()
  const [user, setUser] = useState(null)

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
        {/* Логотип */}
        <div className="flex items-center">
          <Image 
            src={Logo} 
            alt="DigiTech Logo" 
            width={120} 
            height={32}
            className="h-8 w-auto"
          />
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