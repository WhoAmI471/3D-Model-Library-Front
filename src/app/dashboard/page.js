'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

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

  return (
    <div>
      <header className="flex justify-between items-center p-4 bg-blue-600 text-white">
        <div className="text-xl font-bold">DigiTech</div>
        <div className="flex items-center gap-4">
          <span>{user?.name}</span>
          <button onClick={handleLogout} className="bg-white text-blue-600 px-3 py-1 rounded">
            Выйти
          </button>
        </div>
      </header>

      <main className="p-4">
        <h2 className="text-2xl mb-4">Модели</h2>
        <table className="w-full text-left border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Название</th>
              <th className="p-2">Проект</th>
              <th className="p-2">Автор</th>
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model.id} className="border-t">
                <td className="p-2">{model.name}</td>
                <td className="p-2">{model.project?.name}</td>
                <td className="p-2">{model.author?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  )
}
