import Navigation from '@/components/Navigation'
import MainHeader from '@/components/MainHeader'
import { getUserFromSession } from '@/lib/auth'

export default async function DashboardLayout({ children }) {
  const user = await getUserFromSession()
  const role = user?.role || null

  return (
    <div className="flex flex-col h-full">
      <MainHeader />
      <div className="flex flex-1">
        <Navigation userRole={role} />
        <main className="flex-1">
          <div className="py-6 px-4 sm:px-6 lg:px-8 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}