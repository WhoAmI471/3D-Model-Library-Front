import { getUserFromSession } from '@/lib/auth'
import AdminDeletionPanel from '@/components/AdminDeletionPanel'

export default async function deletionRequestsPage() {
  const user = await getUserFromSession()
  const role = user?.role || null

  return (
    <>
      <AdminDeletionPanel userRole={role} />
    </>
  )
}