'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Ошибка входа')
        return
      }

      window.location.href = '/dashboard'
    } catch (err) {
      setError('Ошибка соединения с сервером')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form 
        onSubmit={handleLogin} 
        className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md mx-4"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Вход в систему</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="email"
              placeholder="Введите email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition duration-200"
            type="submit"
          >
            Войти
          </button>
        </div>
      </form>
    </div>
  )
}