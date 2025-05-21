import Navigation from '@/components/Navigation'
import MainHeader from '@/components/MainHeader'

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-full flex flex-col">
      <MainHeader />
      <div className="flex flex-1">
        <Navigation />
        <main className="flex-1">
          <div className="py-6 px-4 sm:px-6 lg:px-8 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}