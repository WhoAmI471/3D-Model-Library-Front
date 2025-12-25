import Navigation from '@/components/Navigation'
import MainHeader from '@/components/MainHeader'
import { getUserFromSession } from '@/lib/auth'

// Принудительно делаем layout динамическим, так как он использует cookies
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }) {
  const user = await getUserFromSession()
  const role = user?.role || null

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <MainHeader />
      <div className="flex flex-1 overflow-hidden">
        <Navigation userRole={role} />
        <main className="flex-1 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  )
}