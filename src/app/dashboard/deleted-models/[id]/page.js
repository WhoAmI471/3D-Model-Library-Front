'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Loading from '@/components/Loading'
import { DeletedModelCard } from '@/components/DeletedModelCard'
import apiClient from '@/lib/apiClient'
import { getErrorMessage, handleError } from '@/lib/errorHandler'

export default function DeletedModelPage({ params }) {
  const { id } = use(params)
  const router = useRouter()
  const [deletedModel, setDeletedModel] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDeletedModel = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/deleted-models/${id}`)
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/dashboard/deleted-models')
            return
          }
          throw new Error('Ошибка загрузки')
        }
        const data = await response.json()
        setDeletedModel(data)
      } catch (error) {
        console.error('Ошибка загрузки удаленной модели:', error)
        router.push('/dashboard/deleted-models')
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      loadDeletedModel()
    }
  }, [id, router])

  if (isLoading) {
    return (
      <div className="min-h-full bg-white flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (!deletedModel) {
    return (
      <div className="min-h-full bg-white flex items-center justify-center">
        <div className="text-gray-500">Модель не найдена</div>
      </div>
    )
  }

  return <DeletedModelCard deletedModel={deletedModel} />
}
