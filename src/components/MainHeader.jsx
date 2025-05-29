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
    setUser(null) // Сбрасываем пользователя сразу
    router.push('/login')
  }

  return (
    <header className="flex justify-between items-center p-4 bg-blue-600 text-white shadow">
      <div className="text-xl font-bold">
        <Image 
          src={Logo} 
          alt="DigiTech Logo" 
          width={135} 
          height={128}
        />
      </div>
      {user ? (
        <div className="flex items-center gap-4">
          <span>{user.name}</span>
          <button
            onClick={handleLogout}
            // className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-gray-100"
          >
            <ArrowRightStartOnRectangleIcon className="h-8 w-8" />
          </button>
        </div>
      ) : (
        <div className="h-8"></div>
      )}
    </header>
  )
}