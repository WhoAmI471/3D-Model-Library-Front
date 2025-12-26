'use client'
import { useState, useEffect, useMemo } from 'react'
import EmployeeForm from '@/components/EmployeeForm'
import { checkPermission } from '@/lib/permission'
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [currentEmployee, setCurrentEmployee] = useState(null)
  const [user, setUser] = useState(null) 

  // Загрузка сотрудников
  useEffect(() => {
    const fetchData = async () => {
      try {
        const employeesResponse = await fetch('/api/employees')
        const employeesData = await employeesResponse.json()
        setEmployees(employeesData)

        const userResponse = await fetch('/api/auth/me')
        const userData = await userResponse.json()
        setUser(userData.user || null)
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const getRoleGroupLabel = (role) => {
    const roleLabels = {
      'ADMIN': 'Администраторы',
      'ARTIST': '3D Художники',
      'PROGRAMMER': 'Программисты',
      'MANAGER': 'Менеджеры',
      'ANALYST': 'Аналитика'
    }
    return roleLabels[role] || 'Другое'
  }

  // Группировка сотрудников по ролям
  const groupedEmployees = useMemo(() => {
    const filtered = employees.filter(employee =>
      employee.name !== 'Admin' && (
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )

    const grouped = {}
    filtered.forEach(employee => {
      const roleLabel = getRoleGroupLabel(employee.role)
      if (!grouped[roleLabel]) {
        grouped[roleLabel] = []
      }
      grouped[roleLabel].push(employee)
    })

    // Сортируем сотрудников внутри группы по имени
    Object.keys(grouped).forEach(role => {
      grouped[role].sort((a, b) => a.name.localeCompare(b.name))
    })

    return grouped
  }, [employees, searchTerm])

  const getRolePositionLabel = (role) => {
    const positionLabels = {
      'ADMIN': 'Администратор',
      'ARTIST': 'Художник',
      'PROGRAMMER': 'Программист',
      'MANAGER': 'Менеджер',
      'ANALYST': 'Аналитик'
    }
    return positionLabels[role] || role
  }

  // Общее количество сотрудников (без Admin)
  const totalEmployees = useMemo(() => {
    return employees.filter(emp => emp.name !== 'Admin').length
  }, [employees])

  // Обработка добавления/обновления сотрудника
  const handleEmployeeSubmit = async (employeeData) => {
    try {
      const method = currentEmployee ? 'PUT' : 'POST'
      const url = currentEmployee 
        ? `/api/employees/${currentEmployee.id}`
        : '/api/employees'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      })
      
      if (response.ok) {
        const result = await response.json()
        if (currentEmployee) {
          setEmployees(employees.map(emp => 
            emp.id === currentEmployee.id ? result : emp
          ))
        } else {
          setEmployees([...employees, result])
        }
        setShowAddForm(false)
        setCurrentEmployee(null)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Ошибка при сохранении сотрудника')
      }
    } catch (error) {
      console.error('Ошибка сохранения сотрудника:', error)
      alert('Ошибка при сохранении сотрудника')
    }
  }

  // Обработка удаления сотрудника
  const handleDelete = async (employee, e) => {
    e.stopPropagation()
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) return
    
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== employee.id))
      }
    } catch (error) {
      console.error('Ошибка удаления сотрудника:', error)
    }
  }

  const handleEdit = async (employee, e) => {
    e.stopPropagation()
    try {
      const response = await fetch(`/api/employees/${employee.id}`)
      if (response.ok) {
        const fullEmployeeData = await response.json()
        setCurrentEmployee(fullEmployeeData)
      } else {
        setCurrentEmployee(employee)
      }
    } catch (error) {
      console.error('Ошибка загрузки данных сотрудника:', error)
      setCurrentEmployee(employee)
    }
    setShowAddForm(true)
  }

  const handleAdd = () => {
    setCurrentEmployee(null)
    setShowAddForm(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Загрузка...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Поиск и кнопка добавления */}
        <div className="mb-6 flex gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по имени или email..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {(user?.role === 'ADMIN' || checkPermission(user, 'manage_users')) && (
            <button 
              onClick={handleAdd}
              className="group relative inline-flex items-center h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium cursor-pointer overflow-hidden"
              style={{ 
                width: '2.5rem', 
                paddingLeft: '0.625rem', 
                paddingRight: '0.625rem',
                transition: 'width 0.2s, padding-right 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.setProperty('width', '220px', 'important')
                e.currentTarget.style.setProperty('padding-right', '2.5rem', 'important')
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.setProperty('width', '2.5rem', 'important')
                e.currentTarget.style.setProperty('padding-right', '0.625rem', 'important')
              }}
              title="Добавить сотрудника"
            >
              <PlusIcon className="h-5 w-5 flex-shrink-0" style={{ color: '#ffffff', strokeWidth: 2 }} />
              <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Добавить сотрудника
              </span>
            </button>
          )}
        </div>

        {/* Список сотрудников компании */}
        <div className="mb-8">
          <p className="text-sm text-gray-500">Список сотрудников компании ({totalEmployees})</p>
        </div>

        {/* Форма сотрудника */}
        {showAddForm && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => {
              setShowAddForm(false)
              setCurrentEmployee(null)
            }}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <EmployeeForm
                employee={currentEmployee}
                onSubmit={handleEmployeeSubmit}
                onCancel={() => {
                  setShowAddForm(false)
                  setCurrentEmployee(null)
                }}
                userRole={user?.role}
              />
            </div>
          </div>
        )}

        {/* Группированные таблицы сотрудников */}
        {Object.keys(groupedEmployees).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              {searchTerm
                ? 'Сотрудники не найдены'
                : 'Нет сотрудников'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Очистить поиск
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedEmployees).map(([roleLabel, roleEmployees]) => (
              <div key={roleLabel}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  {roleLabel} ({roleEmployees.length})
                </h2>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                          ФИ
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          {(user?.role === 'ADMIN' || checkPermission(user, 'manage_users')) ? 'Действия' : ''}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {roleEmployees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {employee.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="truncate">{employee.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {(user?.role === 'ADMIN' || checkPermission(user, 'manage_users')) ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={(e) => handleEdit(employee, e)}
                                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                  title="Редактировать"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={(e) => handleDelete(employee, e)}
                                  className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Удалить"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
