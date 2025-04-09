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

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.message)
      return
    }

    // ✅ УСПЕШНЫЙ ВХОД: здесь и делаем редирект
    router.push('/dashboard')
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-80">
        <h2 className="text-xl font-bold mb-4">Вход</h2>
        <input
          className="w-full border p-2 mb-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border p-2 mb-2"
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button className="bg-blue-600 text-white py-2 px-4 rounded w-full" type="submit">
          Войти
        </button>
      </form>
    </div>
  )
}
