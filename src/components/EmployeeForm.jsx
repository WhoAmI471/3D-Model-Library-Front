'use client'
import { useState, useEffect } from 'react'

const ROLES = [
  { value: 'ADMIN', label: 'Администратор' },
  { value: 'LEAD', label: 'Руководитель' },
  { value: 'ARTIST', label: 'Художник' },
  { value: 'PROGRAMMER', label: 'Программист' },
  { value: 'MANAGER', label: 'Менеджер' },
  { value: 'ANALYST', label: 'Аналитик' }
]

export default function EmployeeForm({ employee, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'ARTIST',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})

  // Заполнение формы при редактировании
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        email: employee.email,
        role: employee.role,
        password: '',
        confirmPassword: ''
      })
    }
  }, [employee])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) newErrors.name = 'Введите имя'
    if (!formData.email.trim()) {
      newErrors.email = 'Введите email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Некорректный email'
    }
    
    // Проверка пароля только при создании нового сотрудника
    if (!employee) {
      if (!formData.password) {
        newErrors.password = 'Введите пароль'
      } else if (formData.password.length < 6) {
        newErrors.password = 'Пароль должен быть не менее 6 символов'
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Пароли не совпадают'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    
    // Подготовка данных для отправки
    const submitData = {
      name: formData.name,
      email: formData.email,
      role: formData.role
    }
    
    // Добавляем пароль только при создании нового сотрудника
    if (!employee) {
      submitData.password = formData.password
    }
    
    onSubmit(submitData)
  }

  return (
    <div className="mb-6 p-4 border rounded bg-gray-50">
      <h2 className="text-xl font-semibold mb-4">
        {employee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1">Имя *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`border p-2 rounded w-full ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          
          <div>
            <label className="block mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`border p-2 rounded w-full ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>
          
          <div>
            <label className="block mb-1">Роль *</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          
          {!employee && (
            <>
              <div>
                <label className="block mb-1">Пароль *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`border p-2 rounded w-full ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Не менее 6 символов"
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>
              
              <div>
                <label className="block mb-1">Подтверждение пароля *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`border p-2 rounded w-full ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            </>
          )}
        </div>
        
        {errors.form && (
          <p className="text-red-500 text-sm mb-4">{errors.form}</p>
        )}
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {employee ? 'Обновить' : 'Сохранить'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}