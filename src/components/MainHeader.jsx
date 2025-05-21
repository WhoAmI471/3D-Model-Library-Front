'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
    setUser(null) // Сбрасываем пользователя сразу
    router.push('/login')
  }

  return (
    <header className="flex justify-between items-center p-4 bg-blue-600 text-white shadow">
      <div className="text-xl font-bold">DigiTech</div>
      {user ? (
        <div className="flex items-center gap-4">
          <span>{user.name}</span>
          <button
            onClick={handleLogout}
            className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-gray-100"
          >
            Выйти
          </button>
        </div>
      ) : (
        <div className="h-8"></div>
      )}
    </header>
  )
}