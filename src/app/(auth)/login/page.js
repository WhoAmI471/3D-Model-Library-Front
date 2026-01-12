'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/apiClient'
import { getErrorMessage, handleError } from '@/lib/errorHandler'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    try {
      await apiClient.auth.login(email, password)
      window.location.href = '/dashboard'
    } catch (err) {
      const formattedError = await handleError(err, { context: 'LoginPage.handleLogin' })
      const errorMessage = getErrorMessage(formattedError)
      setError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <img 
              src="/Logo-3D-libary.svg" 
              alt="3D Library" 
              className="h-10 w-auto"
            />
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                type="email"
                placeholder="Введите email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                Пароль
              </label>
              <input
                id="password"
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                type={showPassword ? "text" : "password"}
                placeholder="Введите пароль"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <div className="mt-3 flex items-center">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showPassword" className="ml-2 text-sm text-gray-700">
                  Показать пароль
                </label>
              </div>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            <button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg transition-colors text-sm font-medium cursor-pointer"
              type="submit"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}