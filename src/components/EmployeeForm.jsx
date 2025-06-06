'use client'
import { useState, useEffect } from 'react'
import { ROLES, ROLE_OPTIONS, ALL_PERMISSIONS, PERMISSION_LABELS, DEFAULT_PERMISSIONS } from '@/lib/roles'

export default function EmployeeForm({ employee, onSubmit, onCancel, userRole }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'ARTIST',
    permissions: [],
    password: '',
    confirmPassword: '',
    changePassword: false
  })
  
  const [useDefaultPermissions, setUseDefaultPermissions] = useState(true)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        email: employee.email,
        role: employee.role,
        permissions: employee.permissions || [],
        password: '',
        confirmPassword: '',
        changePassword: false
      })
      setUseDefaultPermissions(employee.permissions?.length === 0)
    }
  }, [employee])

  useEffect(() => {
    if (useDefaultPermissions) {
      setFormData(prev => ({
        ...prev,
        permissions: DEFAULT_PERMISSIONS[prev.role] || []
      }))
    }
  }, [formData.role, useDefaultPermissions])

  const handlePermissionChange = (permission) => {
    setFormData(prev => {
      const newPermissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
      
      return { ...prev, permissions: newPermissions }
    })
    setUseDefaultPermissions(false)
  }

  const handleRoleChange = (e) => {
    const { value } = e.target
    setFormData(prev => ({ ...prev, role: value }))
    setUseDefaultPermissions(true)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
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
    
    // Валидация пароля только если:
    // 1. Это новый сотрудник ИЛИ
    // 2. Админ включил смену пароля
    if (!employee || (employee && formData.changePassword && userRole === 'ADMIN')) {
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

  // EmployeeForm.js - обновлённая функция handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    setIsSubmitting(true)
    
    try {
      const submitData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        permissions: formData.permissions // Добавляем permissions
      }
      
      // Добавляем пароль только если:
      // 1. Это новый сотрудник ИЛИ
      // 2. Админ включил смену пароля
      if (!employee || (formData.changePassword && userRole === 'ADMIN')) {
        submitData.password = formData.password
      }
      
      await onSubmit(submitData)
    } catch (error) {
      setErrors({ form: error.message || 'Произошла ошибка' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          {employee ? 'Редактирование сотрудника' : 'Добавление сотрудника'}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Заполните обязательные поля (отмечены *)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Имя */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имя <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Иван Иванов"
              maxLength={50}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="example@company.com"
              maxLength={50}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Роль */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Роль <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleRoleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Поля для пароля */}
          {(!employee || (employee && userRole === 'ADMIN')) && (
            <>
              {employee && userRole === 'ADMIN' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="changePassword"
                    name="changePassword"
                    checked={formData.changePassword}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    maxLength={50}
                  />
                  <label htmlFor="changePassword" className="ml-2 block text-sm text-gray-700">
                    Сменить пароль
                  </label>
                </div>
              )}

              {(formData.changePassword || !employee) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Пароль <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Не менее 6 символов"
                      maxLength={50}
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Подтверждение пароля <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Повторите пароль"
                      maxLength={50}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
          
        {/* Общие ошибки формы */}
        {errors.form && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-sm text-red-700">{errors.form}</p>
          </div>
        )}

        {/* Блок прав доступа */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Права доступа</h3>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useDefaultPermissions"
                checked={useDefaultPermissions}
                onChange={(e) => setUseDefaultPermissions(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="useDefaultPermissions" className="ml-2 text-sm text-gray-700">
                Использовать права по умолчанию для роли
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(ALL_PERMISSIONS).map(([key, permission]) => (
              <div key={permission} className="flex items-center">
                <input
                  type="checkbox"
                  id={`permission-${permission}`}
                  checked={formData.permissions.includes(permission)}
                  onChange={() => handlePermissionChange(permission)}
                  disabled={useDefaultPermissions}
                  className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                    useDefaultPermissions ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <label 
                  htmlFor={`permission-${permission}`} 
                  className={`ml-2 text-sm text-gray-700 ${
                    useDefaultPermissions ? 'opacity-50' : ''
                  }`}
                >
                  {PERMISSION_LABELS[permission]}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Сохранение...
              </span>
            ) : employee ? 'Сохранить изменения' : 'Добавить сотрудника'}
          </button>
        </div>
      </form>
    </div>
  )
}