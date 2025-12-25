import { getUserFromSession } from '@/lib/auth'
import AdminDeletionPanel from '@/components/AdminDeletionPanel'

// Принудительно делаем страницу динамической, так как она использует cookies
export const dynamic = 'force-dynamic'

export default async function deletionRequestsPage() {
  const user = await getUserFromSession()
  const role = user?.role || null

  return (
    <>
      <AdminDeletionPanel userRole={role} />
    </>
  )
}