'use client'
import { useState, useEffect, useMemo } from 'react'
import EmployeeForm from '@/components/EmployeeForm'
import Loading from '@/components/Loading'
import { checkPermission } from '@/lib/permission'
import apiClient from '@/lib/apiClient'
import { getErrorMessage, handleError } from '@/lib/errorHandler'
import { useNotification } from '@/hooks/useNotification'
import { useConfirm } from '@/hooks/useConfirm'
import ConfirmModal from '@/components/ConfirmModal'
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
  const { success, error: showError } = useNotification()
  const { isOpen, message, title, confirmText, cancelText, variant, showConfirm, handleConfirm, handleCancel } = useConfirm() 

  // Загрузка сотрудников
  useEffect(() => {
    const fetchData = async () => {
      try {
        const employeesData = await apiClient.employees.getAll()
        setEmployees(employeesData)

        const userData = await apiClient.auth.me()
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
      const result = currentEmployee
        ? await apiClient.employees.update(currentEmployee.id, employeeData)
        : await apiClient.employees.create(employeeData)
      
      if (currentEmployee) {
        setEmployees(employees.map(emp => 
          emp.id === currentEmployee.id ? result : emp
        ))
        success('Сотрудник успешно обновлен')
      } else {
        setEmployees([...employees, result])
        success('Сотрудник успешно создан')
      }
      setShowAddForm(false)
      setCurrentEmployee(null)
    } catch (error) {
      const formattedError = await handleError(error, { context: 'EmployeesPage.handleEmployeeSubmit', employeeId: currentEmployee?.id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
    }
  }

  // Обработка удаления сотрудника
  const handleDelete = async (employee, e) => {
    e.stopPropagation()
    
    const confirmed = await showConfirm({
      message: `Вы уверены, что хотите удалить сотрудника "${employee.name}"?`,
      variant: 'danger',
      confirmText: 'Удалить'
    })
    
    if (!confirmed) return
    
    try {
      await apiClient.employees.delete(employee.id)
      setEmployees(employees.filter(emp => emp.id !== employee.id))
      success('Сотрудник успешно удален')
    } catch (error) {
      const formattedError = await handleError(error, { context: 'EmployeesPage.handleDelete', employeeId: employee.id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
    }
  }

  const handleEdit = async (employee, e) => {
    e.stopPropagation()
    try {
      try {
        const fullEmployeeData = await apiClient.employees.getById(employee.id)
        setCurrentEmployee(fullEmployeeData)
      } catch (error) {
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
          <div className="flex items-center justify-center h-64">
            <Loading />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Сотрудники</h1>
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
          <EmployeeForm
            employee={currentEmployee}
            onSubmit={handleEmployeeSubmit}
            onCancel={() => {
              setShowAddForm(false)
              setCurrentEmployee(null)
            }}
            userRole={user?.role}
          />
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

      <ConfirmModal
        isOpen={isOpen}
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        variant={variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  )
}
