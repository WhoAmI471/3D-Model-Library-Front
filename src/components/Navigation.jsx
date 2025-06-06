'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderIcon, CubeIcon, UsersIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline'


export default function Navigation({ userRole }) {
  const pathname = usePathname()

  const navItems = [
    {
      name: 'Модели',
      href: '/dashboard',
      icon: <CubeIcon className="w-5 h-5" />,
      current: pathname === '/dashboard'
    },
    {
      name: 'Проекты',
      href: '/dashboard/projects',
      icon: <FolderIcon className="w-5 h-5" />,
      current: pathname === '/dashboard/projects'
    },
    {
      name: 'Сотрудники',
      href: '/dashboard/employees',
      icon: <UsersIcon className="w-5 h-5" />,
      current: pathname === '/dashboard/employees'
    },
    
    ...(userRole === 'ADMIN' ? [
    {
      name: 'Логи',
      href: '/dashboard/logs',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      current: pathname === '/dashboard/logs'
    }] : []),
    ...(userRole === 'ADMIN' ? [{
      name: 'Удаление моделей',
      href: '/dashboard/deletion-requests',
      icon: <TrashIcon className="w-5 h-5" />,
      current: pathname === '/dashboard/deletion-requests'
    }] : [])
  ]

  return (
    <div className="hidden md:flex h-full md:w-64 md:flex-col md:inset-y-0 bg-white border-r">
      {/* Логотип и заголовок */}
      <div className="flex items-center h-16 px-4 border-b">
        <div className="flex items-center">
          <CubeIcon className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-xl font-semibold">Меню</span>
        </div>
      </div>
      
      {/* Основное меню */}
      <div className="flex-1 overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                item.current
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      
      {/* Профиль пользователя */}
      {/* <div className="p-4 border-t">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-600">ГА</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">Григорий А.</p>
            <p className="text-xs text-gray-500">Администратор</p>
          </div>
        </div>
      </div> */}
    </div>
  )
}