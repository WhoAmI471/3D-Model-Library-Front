'use client'
import { useState, useEffect } from 'react'
import { ROLES, ROLE_OPTIONS, ALL_PERMISSIONS, PERMISSION_LABELS, DEFAULT_PERMISSIONS } from '@/lib/roles'
import { XMarkIcon } from '@heroicons/react/24/outline'

export default function EmployeeForm({ employee, onSubmit, onCancel, userRole }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'ARTIST',
    permissions: [],
    password: '',
    confirmPassword: ''
  })
  
  // Загружаем сохраненное значение из localStorage или используем true по умолчанию
  const getSavedUseDefaultPermissions = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employeeForm_useDefaultPermissions')
      return saved !== null ? saved === 'true' : true
    }
    return true
  }

  const [useDefaultPermissions, setUseDefaultPermissions] = useState(getSavedUseDefaultPermissions())
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [mouseDownTarget, setMouseDownTarget] = useState(null)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showPassword, setShowPassword] = useState(false)


  // Сохраняем состояние в localStorage при изменении
  const handleUseDefaultPermissionsChange = (checked) => {
    setUseDefaultPermissions(checked)
    if (typeof window !== 'undefined') {
      localStorage.setItem('employeeForm_useDefaultPermissions', checked.toString())
    }
  }

  useEffect(() => {
    if (employee) {
      const hasPermissions = employee.permissions && Array.isArray(employee.permissions) && employee.permissions.length > 0
      const employeePermissions = Array.isArray(employee.permissions) ? employee.permissions : []
      
      // ВАЖНО: Никогда не загружаем пароль из данных сотрудника
      // Пароль всегда остается пустым при редактировании
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        role: employee.role || 'ARTIST',
        permissions: [...employeePermissions], // Создаем копию массива
        password: '', // Пароль всегда пустой - никогда не показываем существующий пароль
        confirmPassword: ''
      })
      
      // Используем сохраненное значение из localStorage
      setUseDefaultPermissions(getSavedUseDefaultPermissions())
      setIsInitialized(true)
    } else {
      // Сброс формы для нового сотрудника
      setFormData({
        name: '',
        email: '',
        role: 'ARTIST',
        permissions: [],
        password: '',
        confirmPassword: ''
      })
      // Используем сохраненное значение из localStorage
      setUseDefaultPermissions(getSavedUseDefaultPermissions())
      setIsInitialized(true)
    }
  }, [employee])

  useEffect(() => {
    // Применяем права по умолчанию только если:
    // 1. Форма инициализирована
    // 2. Флаг useDefaultPermissions установлен в true
    if (!isInitialized) return
    
    if (useDefaultPermissions) {
      // Всегда применяем права по умолчанию для текущей роли, когда чекбокс включен
      setFormData(prev => ({
        ...prev,
        permissions: DEFAULT_PERMISSIONS[prev.role] || []
      }))
    }
  }, [formData.role, useDefaultPermissions, isInitialized])

  const handlePermissionChange = (permission) => {
    setFormData(prev => {
      const isAdding = !prev.permissions.includes(permission)
      let newPermissions = isAdding
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
      
      // Если включаем "Редактирование описания", автоматически включаем права на редактирование сферы и скриншотов
      if (permission === ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION && isAdding) {
        if (!newPermissions.includes(ALL_PERMISSIONS.EDIT_MODEL_SPHERE)) {
          newPermissions.push(ALL_PERMISSIONS.EDIT_MODEL_SPHERE)
        }
        if (!newPermissions.includes(ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS)) {
          newPermissions.push(ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS)
        }
      }
      
      // Если выключаем "Редактирование описания", также выключаем права на сферу и скриншоты
      if (permission === ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION && !isAdding) {
        newPermissions = newPermissions.filter(p => 
          p !== ALL_PERMISSIONS.EDIT_MODEL_SPHERE && 
          p !== ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS
        )
      }
      
      return { ...prev, permissions: newPermissions }
    })
    setUseDefaultPermissions(false)
  }

  const handleRoleChange = (e) => {
    const { value } = e.target
    setFormData(prev => ({ 
      ...prev, 
      role: value
    }))
    // Если это редактирование и у сотрудника есть права, сохраняем их
    // Иначе используем права по умолчанию для новой роли
    if (employee && employee.permissions && Array.isArray(employee.permissions) && employee.permissions.length > 0) {
      // Сохраняем текущие права, не переключаем на дефолтные
      setUseDefaultPermissions(false)
    } else {
      // Для нового сотрудника или сотрудника без прав используем дефолтные
      setUseDefaultPermissions(true)
    }
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
    if (!employee || (employee && showPasswordChange && userRole === 'ADMIN')) {
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
      if (!employee || (employee && showPasswordChange && userRole === 'ADMIN')) {
        submitData.password = formData.password
      }
      
      await onSubmit(submitData)
    } catch (error) {
      setErrors({ form: error.message || 'Произошла ошибка' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      setMouseDownTarget(e.target)
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
      onCancel()
    }
    setMouseDownTarget(null)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onMouseDown={handleOverlayMouseDown}
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {employee ? 'Редактировать сотрудника' : 'Создать нового сотрудника'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Имя */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">
                  Имя <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
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
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
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
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">
                  Роль <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleRoleChange}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Кнопка смены пароля (только для редактирования) */}
              {employee && userRole === 'ADMIN' && (
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3 opacity-0 pointer-events-none">
                    &nbsp;
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(!showPasswordChange)
                      if (showPasswordChange) {
                        // Очищаем поля пароля при отмене
                        setFormData(prev => ({
                          ...prev,
                          password: '',
                          confirmPassword: ''
                        }))
                        setErrors(prev => ({
                          ...prev,
                          password: '',
                          confirmPassword: ''
                        }))
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {showPasswordChange ? 'Отмена смены пароля' : 'Сменить пароль'}
                  </button>
                </div>
              )}

          {/* Поля для пароля */}
          {(!employee || (employee && userRole === 'ADMIN')) && (
            <>
              {(showPasswordChange || !employee) && (
                <>
                  {employee && (
                    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Внимание:</strong> Существующий пароль сотрудника не может быть просмотрен по соображениям безопасности. 
                        Для изменения пароля установите новый пароль в полях ниже.
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">
                      {employee ? 'Новый пароль' : 'Пароль'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`block w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={employee ? "Введите новый пароль (не менее 6 символов)" : "Не менее 6 символов"}
                      maxLength={50}
                      autoComplete="new-password"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">
                      {employee ? 'Подтверждение нового пароля' : 'Подтверждение пароля'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`block w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={employee ? "Повторите новый пароль" : "Повторите пароль"}
                      maxLength={50}
                      autoComplete="new-password"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Чекбокс показать пароль */}
                  <div className="col-span-2 flex items-center">
                    <input
                      type="checkbox"
                      id="showPassword"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="showPassword" className="ml-2 text-sm text-gray-700">
                      Показать пароль
                    </label>
                  </div>
                </>
              )}
            </>
          )}
        </div>
          
            {/* Общие ошибки формы */}
            {errors.form && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{errors.form}</p>
              </div>
            )}

            {/* Блок прав доступа */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Права доступа</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="useDefaultPermissions"
                    checked={useDefaultPermissions}
                    onChange={(e) => handleUseDefaultPermissionsChange(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="useDefaultPermissions" className="ml-2 text-sm text-gray-700">
                    Использовать права по умолчанию для роли
                  </label>
                </div>
              </div>

              {/* Группировка прав по категориям */}
              {(() => {
                const permissionCategories = {
                  'Проекты': [
                    ALL_PERMISSIONS.CREATE_PROJECTS,
                    ALL_PERMISSIONS.EDIT_PROJECTS
                  ],
                  'Модели': [
                    ALL_PERMISSIONS.UPLOAD_MODELS,
                    ALL_PERMISSIONS.EDIT_MODELS,
                    ALL_PERMISSIONS.DELETE_MODELS,
                    ALL_PERMISSIONS.DOWNLOAD_MODELS,
                    ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION,
                    ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS
                  ],
                  'Сферы': [
                    ALL_PERMISSIONS.ADD_SPHERE,
                    ALL_PERMISSIONS.EDIT_MODEL_SPHERE
                  ],
                  'Пользователи': [
                    ALL_PERMISSIONS.MANAGE_USERS
                  ]
                }

                return Object.entries(permissionCategories).map(([categoryName, categoryPermissions]) => {
                  const availablePermissions = categoryPermissions.filter(perm => 
                    Object.values(ALL_PERMISSIONS).includes(perm)
                  )

                  if (availablePermissions.length === 0) return null

                  return (
                    <div key={categoryName} className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                        {categoryName}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                        {availablePermissions.map((permission) => (
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
                  )
                })
              })()}
            </div>

            {/* Кнопки действий */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Отмена
              </button>
              <button
                type="submit"
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
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
      </div>
    </div>
  )
}