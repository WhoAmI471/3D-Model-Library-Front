// app/models/upload/page.js
'use client'
import { useSession } from 'next-auth/react'
import ModelUploadForm from '@/components/ModelUploadForm'

export default function UploadPage() {
  // const { data: session } = useSession()
  // const authorId = session?.user?.id

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Загрузка модели</h1>
      <ModelUploadForm />
    </div>
  )
}