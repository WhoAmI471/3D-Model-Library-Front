'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'


export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [models, setModels] = useState([])
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const userRes = await axios.get('/api/auth/me')
        setUser(userRes.data.user)

        const modelsRes = await axios.get('/api/models')
        setModels(modelsRes.data)
      } catch (err) {
        router.push('/login')
      }
    }

    load()
  }, [])

  const handleLogout = async () => {
    await axios.post('/api/auth/logout')
    router.push('/login')
  }

  const handleUpload = async () => {
    // await axios.post('/api/auth/logout')
    router.push('/dashboard/models/upload')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-blue-600 text-white shadow">
        <div className="text-xl font-bold">DigiTech</div>
        <div className="flex items-center gap-4">
          <span>{user?.name}</span>
          <button
            onClick={handleLogout}
            className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-gray-100"
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Модели</h2>
          {/* <Link href="/models/upload"> */}
            <button onClick={handleUpload} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              ➕ Добавить модель
            </button>
          {/* </Link> */}
        </div>

        {/* Модели */}
        <table className="w-full bg-white shadow rounded overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Название</th>
              <th className="p-3 text-left">Проект</th>
              <th className="p-3 text-left">Автор</th>
              <th className="p-3 text-center">Действия</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{model.title}</td>
                <td className="p-3">{model.project?.name || '—'}</td>
                <td className="p-3">{model.author?.name || '—'}</td>
                <td className="p-3 text-center space-x-2">
                  <Link href={`/dashboard/models/${model.id}`}>
                    <button className="text-blue-600 hover:underline">Открыть</button>
                  </Link>
                  <Link href={`/dashboard/models/update/${model.id}`}>
                    <button className="text-yellow-600 hover:underline">✏️</button>
                  </Link>
                  <button className="text-red-600 hover:underline">❌</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  )
}
