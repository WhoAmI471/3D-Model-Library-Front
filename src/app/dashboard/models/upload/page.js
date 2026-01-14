// app/models/upload/page.js
'use client'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import ModelUploadForm from '@/components/ModelUploadForm'

export default function UploadPage() {
  // const { data: session } = useSession()
  // const authorId = session?.user?.id
  const searchParams = useSearchParams()
  const projectId = searchParams?.get('projectId')
  const sphereId = searchParams?.get('sphereId')

  return (
    <div className="w-full mx-auto">
      {/* <h1 className="text-2xl font-bold mb-4">Загрузка модели</h1> */}
      <ModelUploadForm initialProjectId={projectId} initialSphereId={sphereId} />
    </div>
  )
}