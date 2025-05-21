'use client'
import { useState, useEffect } from 'react'
import EmployeeForm from '@/components/EmployeeForm'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [currentEmployee, setCurrentEmployee] = useState(null)

  // Загрузка сотрудников
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees')
        const data = await response.json()
        setEmployees(data)
      } catch (error) {
        console.error('Ошибка загрузки сотрудников:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchEmployees()
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
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Сотрудники</h1>
        <button
          onClick={() => {
            setCurrentEmployee(null)
            setShowAddForm(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Добавить сотрудника
        </button>
      </div>

      {/* Форма поиска */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Найти сотрудника"
          className="border p-2 rounded w-full max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Форма добавления/редактирования сотрудника */}
      {showAddForm && (
        <EmployeeForm
          employee={currentEmployee}
          onSubmit={handleEmployeeSubmit}
          onCancel={() => {
            setShowAddForm(false)
            setCurrentEmployee(null)
          }}
        />
      )}

      {/* Таблица сотрудников */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border text-left">Имя</th>
              <th className="py-2 px-4 border text-left">Email</th>
              <th className="py-2 px-4 border text-left">Роль</th>
              <th className="py-2 px-4 border text-left">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">{employee.name}</td>
                  <td className="py-2 px-4 border">{employee.email}</td>
                  <td className="py-2 px-4 border">
                    {employee.role === 'ADMIN' ? 'Администратор' : 
                     employee.role === 'LEAD' ? 'Руководитель' :
                     employee.role === 'ARTIST' ? 'Художник' :
                     employee.role === 'PROGRAMMER' ? 'Программист' :
                     employee.role === 'MANAGER' ? 'Менеджер' : 'Аналитик'}
                  </td>
                  <td className="py-2 px-4 border">
                    <button 
                      onClick={() => {
                        setCurrentEmployee(employee)
                        setShowAddForm(true)
                      }}
                      className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                      Редактировать
                    </button>
                    <button 
                      onClick={() => handleDelete(employee.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 px-4 border text-center text-gray-500">
                  Сотрудники не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}