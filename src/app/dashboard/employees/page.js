'use client'
import { useState, useEffect } from 'react'
import EmployeeForm from '@/components/EmployeeForm'
import Image from 'next/image'

import Delete from "../../../../public/Delete.svg"
import Edit from "../../../../public/Edit.svg"


export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [currentEmployee, setCurrentEmployee] = useState(null)
  const [userRole, setUserRole] = useState(null) 

  // Загрузка сотрудников
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загружаем сотрудников
        const employeesResponse = await fetch('/api/employees')
        const employeesData = await employeesResponse.json()
        setEmployees(employeesData)

        // Загружаем информацию о текущем пользователе
        const userResponse = await fetch('/api/auth/me')
        const userData = await userResponse.json()
        setUserRole(userData.user?.role || null)
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Поиск сотрудников
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          // Обновление существующего сотрудника
          setEmployees(employees.map(emp => 
            emp.id === currentEmployee.id ? result : emp
          ))
        } else {
          // Добавление нового сотрудника
          setEmployees([...employees, result])
        }
        setShowAddForm(false)
        setCurrentEmployee(null)
      }
    } catch (error) {
      console.error('Ошибка сохранения сотрудника:', error)
    }
  }

  // Обработка удаления сотрудника
  const handleDelete = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) return
    
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== id))
      }
    } catch (error) {
      console.error('Ошибка удаления сотрудника:', error)
    }
  }

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок и кнопки */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Сотрудники</h1>
          
          {userRole === 'ADMIN' && (
            <button
              onClick={() => {
                setCurrentEmployee(null)
                setShowAddForm(true)
              }}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 shadow-sm transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              {/* <PlusIcon className="h-5 w-5" /> */}
              Добавить сотрудника
            </button>
          )}
        </div>

        {/* Поиск */}
        <div className="mb-6">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Поиск по имени или email"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Форма сотрудника */}
        {showAddForm && (
          <div 
            className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
            // onClick={() => setShowProjectFilter(false)}
          >
            <EmployeeForm
              employee={currentEmployee}
              onSubmit={handleEmployeeSubmit}
              onCancel={() => {
                setShowAddForm(false)
                setCurrentEmployee(null)
              }}
            />
          </div>
        )}

        {/* Таблица сотрудников */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Имя
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Роль
                </th>
                {userRole === 'ADMIN' && (
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 odd:bg-blue-50 even:bg-white">
                    <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.name}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                      {employee.email}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        employee.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                        employee.role === 'LEAD' ? 'bg-blue-100 text-blue-800' :
                        employee.role === 'ARTIST' ? 'bg-green-100 text-green-800' :
                        employee.role === 'PROGRAMMER' ? 'bg-yellow-100 text-yellow-800' :
                        employee.role === 'MANAGER' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {employee.role === 'ADMIN' ? 'Администратор' : 
                         employee.role === 'LEAD' ? 'Руководитель' :
                         employee.role === 'ARTIST' ? 'Художник' :
                         employee.role === 'PROGRAMMER' ? 'Программист' :
                         employee.role === 'MANAGER' ? 'Менеджер' : 'Аналитик'}
                      </span>
                    </td>
                    {userRole === 'ADMIN' && (
                      <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => {
                              setCurrentEmployee(employee)
                              setShowAddForm(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Редактировать"
                          >
                            {/* <PencilIcon className="h-5 w-5" /> */}
                            <Image 
                              src={Edit} 
                              alt="DigiTech Logo" 
                              width={20} 
                              height={20}
                            />
                          </button>
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Удалить"
                          >
                            <Image 
                              src={Delete} 
                              alt="DigiTech Logo" 
                              width={20} 
                              height={20}
                            />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td 
                    colSpan={userRole === 'ADMIN' ? 4 : 3} 
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Сотрудники не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}