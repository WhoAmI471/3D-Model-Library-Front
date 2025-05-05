'use client'

import { useParams } from 'next/navigation'
import ModelEditForm from '@/components/ModelEditForm'

export default function UpdatePage() {
  const { id } = useParams()

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Редактирование модели</h1>
      <ModelEditForm id={id} />
    </div>
  )
}
