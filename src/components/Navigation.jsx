'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  FolderIcon, 
  CubeIcon, 
  UsersIcon, 
  TrashIcon, 
  DocumentTextIcon,
  Squares2X2Icon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline'

export default function Navigation({ userRole }) {
  const pathname = usePathname()

  const navItems = [
    {
      name: 'Модели',
      href: '/dashboard',
      icon: CubeIcon,
      current: pathname === '/dashboard'
    },
    {
      name: 'Проекты',
      href: '/dashboard/projects',
      icon: FolderIcon,
      current: pathname === '/dashboard/projects'
    },
    {
      name: 'Сферы',
      href: '/dashboard/spheres',
      icon: Squares2X2Icon,
      current: pathname === '/dashboard/spheres'
    },
    ...(userRole === 'ADMIN' || userRole === 'MANAGER' ? [{
      name: 'Сотрудники',
      href: '/dashboard/employees',
      icon: UsersIcon,
      current: pathname === '/dashboard/employees'
    }] : []),
    ...(userRole === 'ADMIN' ? [{
      name: 'Логи',
      href: '/dashboard/logs',
      icon: DocumentTextIcon,
      current: pathname === '/dashboard/logs'
    }] : []),
    ...(userRole === 'ADMIN' ? [{
      name: 'Удаление моделей',
      href: '/dashboard/deletion-requests',
      icon: TrashIcon,
      current: pathname === '/dashboard/deletion-requests'
    }] : []),
    ...(userRole === 'ADMIN' ? [{
      name: 'История удаленных моделей',
      href: '/dashboard/deleted-models',
      icon: ArchiveBoxIcon,
      current: pathname?.startsWith('/dashboard/deleted-models')
    }] : [])
  ]

  return (
    <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200">
      {/* Меню */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                item.current
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
              }`}
            >
              <Icon className={`h-5 w-5 ${item.current ? 'text-blue-600' : 'text-gray-500'}`} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}