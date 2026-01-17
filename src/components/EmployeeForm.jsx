'use client'
import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ROLES, ROLE_OPTIONS, ALL_PERMISSIONS, PERMISSION_LABELS, DEFAULT_PERMISSIONS } from '@/lib/roles'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useModal } from '@/hooks/useModal'
import { createEmployeeSchema, updateEmployeeSchema } from '@/lib/validations/employeeSchema'
import { getErrorMessage, handleError } from '@/lib/errorHandler'

export default function EmployeeForm({ employee, onSubmit, onCancel, userRole }) {
  // Определяем начальное состояние галочки на основе данных сотрудника
  const getInitialUseDefaultPermissions = () => {
    if (employee && employee.role) {
      // Для существующего сотрудника проверяем, соответствуют ли его права правам по умолчанию
      const defaultPerms = DEFAULT_PERMISSIONS[employee.role] || []
      const employeePerms = Array.isArray(employee.permissions) ? employee.permissions : []
      
      // Сравниваем массивы прав (порядок не важен)
      const defaultPermsSorted = [...defaultPerms].sort()
      const employeePermsSorted = [...employeePerms].sort()
      
      return JSON.stringify(defaultPermsSorted) === JSON.stringify(employeePermsSorted)
    }
    // Для нового сотрудника используем true по умолчанию
    return true
  }

  const [useDefaultPermissions, setUseDefaultPermissions] = useState(getInitialUseDefaultPermissions())
  const [initialUseDefaultPermissions, setInitialUseDefaultPermissions] = useState(getInitialUseDefaultPermissions())
  const [isInitialized, setIsInitialized] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Обработчик отмены с сбросом состояния
  const handleCancel = () => {
    // При отмене сбрасываем состояние к исходному
    setUseDefaultPermissions(initialUseDefaultPermissions)
    onCancel()
  }

  const modalHandlers = useModal(handleCancel)

  // Определяем, требуется ли пароль
  const requirePassword = useMemo(() => {
    return !employee || (employee && showPasswordChange && userRole === 'ADMIN')
  }, [employee, showPasswordChange, userRole])

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
    trigger,
    setError,
    clearErrors
  } = useForm({
    resolver: zodResolver(updateEmployeeSchema), // Всегда используем updateEmployeeSchema, валидацию пароля делаем вручную
    defaultValues: {
      name: '',
      email: '',
      role: 'ARTIST',
      permissions: [],
      password: '',
      confirmPassword: ''
    },
    mode: 'onBlur' // Изменено на onBlur, чтобы не показывать ошибки до начала ввода
  })

  // Условная валидация пароля при изменении requirePassword
  // Используем watch для отслеживания значений, но валидацию запускаем только при реальных изменениях
  const password = watch('password')
  const confirmPassword = watch('confirmPassword')
  
  useEffect(() => {
    if (!isInitialized) return
    if (!requirePassword) {
      // Пароль не требуется - очищаем ошибки
      clearErrors('password')
      clearErrors('confirmPassword')
      return
    }
    
    // Валидация только если поля не пустые (пользователь начал заполнять)
    const passwordTouched = password && password.length > 0
    const confirmPasswordTouched = confirmPassword && confirmPassword.length > 0
    
    if (passwordTouched) {
      if (password.length < 6) {
        setError('password', { type: 'minLength', message: 'Пароль должен быть не менее 6 символов' })
      } else {
        clearErrors('password')
      }
    } else {
      clearErrors('password')
    }
    
    if (confirmPasswordTouched) {
      if (password !== confirmPassword) {
        setError('confirmPassword', { type: 'match', message: 'Пароли не совпадают' })
      } else {
        clearErrors('confirmPassword')
      }
    } else {
      clearErrors('confirmPassword')
    }
  }, [password, confirmPassword, requirePassword, setError, clearErrors, isInitialized])

  const watchedRole = watch('role')
  const watchedPermissions = watch('permissions')

  // Обработка изменения галочки (без сохранения в localStorage)
  const handleUseDefaultPermissionsChange = (checked) => {
    setUseDefaultPermissions(checked)
  }

  // Инициализация формы
  useEffect(() => {
    const initialValue = getInitialUseDefaultPermissions()
    setUseDefaultPermissions(initialValue)
    setInitialUseDefaultPermissions(initialValue)
    
    if (employee) {
      const employeePermissions = Array.isArray(employee.permissions) ? employee.permissions : []
      reset({
        name: employee.name || '',
        email: employee.email || '',
        role: employee.role || 'ARTIST',
        permissions: [...employeePermissions],
        password: '',
        confirmPassword: ''
      })
    } else {
      reset({
        name: '',
        email: '',
        role: 'ARTIST',
        permissions: [],
        password: '',
        confirmPassword: ''
      })
    }
    setIsInitialized(true)
  }, [employee, reset])

  // Применение прав по умолчанию при изменении роли
  useEffect(() => {
    if (!isInitialized) return
    
    if (useDefaultPermissions && watchedRole) {
      const defaultPerms = DEFAULT_PERMISSIONS[watchedRole] || []
      setValue('permissions', defaultPerms, { shouldValidate: false })
    }
  }, [watchedRole, useDefaultPermissions, isInitialized, setValue])

  const handlePermissionChange = (permission) => {
    const currentPermissions = watchedPermissions || []
    const isAdding = !currentPermissions.includes(permission)
    let newPermissions = isAdding
      ? [...currentPermissions, permission]
      : currentPermissions.filter(p => p !== permission)
    
    // Если включаем "Редактирование моделей", автоматически включаем устаревшие права для обратной совместимости
    if (permission === ALL_PERMISSIONS.EDIT_MODELS && isAdding) {
      if (!newPermissions.includes(ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION)) {
        newPermissions.push(ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION)
      }
      if (!newPermissions.includes(ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS)) {
        newPermissions.push(ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS)
      }
    }
    
    // Если выключаем "Редактирование моделей", также выключаем устаревшие права
    if (permission === ALL_PERMISSIONS.EDIT_MODELS && !isAdding) {
      newPermissions = newPermissions.filter(p => 
        p !== ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION && 
        p !== ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS
      )
    }
    
    // Если включаем устаревшие права, автоматически включаем EDIT_MODELS
    if ((permission === ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION || permission === ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS) && isAdding) {
      if (!newPermissions.includes(ALL_PERMISSIONS.EDIT_MODELS)) {
        newPermissions.push(ALL_PERMISSIONS.EDIT_MODELS)
      }
      // Если включаем "Редактирование описания", автоматически включаем права на редактирование сферы и скриншотов (для обратной совместимости)
      if (permission === ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION) {
        if (!newPermissions.includes(ALL_PERMISSIONS.EDIT_MODEL_SPHERE)) {
          newPermissions.push(ALL_PERMISSIONS.EDIT_MODEL_SPHERE)
        }
        if (!newPermissions.includes(ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS)) {
          newPermissions.push(ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS)
        }
      }
    }
    
    // Если выключаем устаревшие права, проверяем, нужно ли выключить EDIT_MODELS
    if ((permission === ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION || permission === ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS) && !isAdding) {
      const hasOtherEditRights = newPermissions.includes(ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION) || 
                                  newPermissions.includes(ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS) ||
                                  newPermissions.includes(ALL_PERMISSIONS.EDIT_MODELS)
      if (!hasOtherEditRights) {
        newPermissions = newPermissions.filter(p => p !== ALL_PERMISSIONS.EDIT_MODELS)
      }
      // Если выключаем "Редактирование описания", также выключаем права на сферу и скриншоты (для обратной совместимости)
      if (permission === ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION) {
        newPermissions = newPermissions.filter(p => 
          p !== ALL_PERMISSIONS.EDIT_MODEL_SPHERE && 
          p !== ALL_PERMISSIONS.EDIT_MODEL_SCREENSHOTS
        )
      }
    }
    
    setValue('permissions', newPermissions, { shouldValidate: false })
    setUseDefaultPermissions(false)
  }

  const handleRoleChange = (e) => {
    const { value } = e.target
    setValue('role', value, { shouldValidate: true })
    
    // Если это редактирование и у сотрудника есть права, сохраняем их
    // Иначе используем права по умолчанию для новой роли
    if (employee && employee.permissions && Array.isArray(employee.permissions) && employee.permissions.length > 0) {
      setUseDefaultPermissions(false)
    } else {
      setUseDefaultPermissions(true)
    }
  }

  const handleTogglePasswordChange = () => {
    const newValue = !showPasswordChange
    setShowPasswordChange(newValue)
    
    if (!newValue) {
      // Очищаем поля пароля при отмене
      setValue('password', '', { shouldValidate: false })
      setValue('confirmPassword', '', { shouldValidate: false })
      trigger('password')
      trigger('confirmPassword')
    }
  }

  const onSubmitForm = async (data) => {
    // Дополнительная проверка пароля перед отправкой
    if (requirePassword) {
      if (!data.password || data.password.length === 0) {
        setError('password', { type: 'required', message: 'Введите пароль' })
        return
      }
      if (data.password.length < 6) {
        setError('password', { type: 'minLength', message: 'Пароль должен быть не менее 6 символов' })
        return
      }
      if (data.password !== data.confirmPassword) {
        setError('confirmPassword', { type: 'match', message: 'Пароли не совпадают' })
        return
      }
    }
    
    try {
      const submitData = {
        name: data.name,
        email: data.email,
        role: data.role,
        permissions: data.permissions
      }
      
      // Добавляем пароль только если:
      // 1. Это новый сотрудник ИЛИ
      // 2. Админ включил смену пароля
      if (requirePassword && data.password && data.password.length > 0) {
        submitData.password = data.password
      }
      
      await onSubmit(submitData)
    } catch (error) {
      // Используем централизованную обработку ошибок
      const formattedError = await handleError(error, { context: 'EmployeeForm.onSubmit' })
      const errorMessage = getErrorMessage(formattedError)
      setError('root', { type: 'server', message: errorMessage })
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onMouseDown={modalHandlers.handleOverlayMouseDown}
      onClick={modalHandlers.handleOverlayClick}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onMouseDown={modalHandlers.handleContentMouseDown}
        onClick={modalHandlers.handleContentClick}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {employee ? 'Редактировать сотрудника' : 'Создать нового сотрудника'}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleFormSubmit(onSubmitForm)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Имя */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">
                  Имя <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className={`block w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Иван Иванов"
                  maxLength={50}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className={`block w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="example@company.com"
                  maxLength={50}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Роль */}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">
                  Роль <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('role')}
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
                    onClick={handleTogglePasswordChange}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
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
                      value={password || ''}
                      onChange={(e) => {
                        setValue('password', e.target.value, { shouldValidate: true })
                        trigger('password')
                      }}
                      onBlur={() => trigger('password')}
                      className={`block w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={employee ? "Введите новый пароль (не менее 6 символов)" : "Не менее 6 символов"}
                      maxLength={50}
                      autoComplete="new-password"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wide mb-3">
                      {employee ? 'Подтверждение нового пароля' : 'Подтверждение пароля'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword || ''}
                      onChange={(e) => {
                        setValue('confirmPassword', e.target.value, { shouldValidate: true })
                        trigger('confirmPassword')
                      }}
                      onBlur={() => trigger('confirmPassword')}
                      className={`block w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={employee ? "Повторите новый пароль" : "Повторите пароль"}
                      maxLength={50}
                      autoComplete="new-password"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
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
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{errors.root.message}</p>
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
                    ALL_PERMISSIONS.EDIT_ALL_MODELS, // Кастомное право для редактирования всех моделей
                    ALL_PERMISSIONS.DELETE_MODELS,
                    ALL_PERMISSIONS.DOWNLOAD_MODELS,
                    ALL_PERMISSIONS.EDIT_MODEL_SPHERE
                  ],
                  'Сферы': [
                    ALL_PERMISSIONS.ADD_SPHERE,
                    ALL_PERMISSIONS.EDIT_SPHERE
                  ]
                }

                return Object.entries(permissionCategories).map(([categoryName, categoryPermissions]) => {
                  // Фильтруем права: EDIT_ALL_MODELS показываем только для Художника
                  let filteredPermissions = categoryPermissions.filter(perm => 
                    Object.values(ALL_PERMISSIONS).includes(perm)
                  )
                  
                  // Для ролей, отличных от ARTIST, скрываем EDIT_ALL_MODELS
                  if (watchedRole !== ROLES.ARTIST) {
                    filteredPermissions = filteredPermissions.filter(perm => perm !== ALL_PERMISSIONS.EDIT_ALL_MODELS)
                  }
                  
                  const availablePermissions = filteredPermissions

                  if (availablePermissions.length === 0) return null

                  return (
                    <div key={categoryName} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {categoryName}
                        </h4>
                        {watchedRole === ROLES.ARTIST && (categoryName === 'Проекты' || categoryName === 'Сферы') && (
                          <span className="text-xs text-gray-500 italic">
                            (может изменять {categoryName === 'Проекты' ? 'проекты' : 'сферы'} у моделей)
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                        {availablePermissions.map((permission) => (
                          <div key={permission} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`permission-${permission}`}
                              checked={watchedPermissions?.includes(permission)}
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
                              {permission === ALL_PERMISSIONS.EDIT_MODELS && watchedRole === ROLES.ARTIST
                                ? 'Редактирование только своих моделей'
                                : permission === ALL_PERMISSIONS.EDIT_ALL_MODELS && watchedRole === ROLES.ARTIST
                                ? 'Редактирование всех моделей (для Художника)'
                                : PERMISSION_LABELS[permission]}
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
                onClick={handleCancel}
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
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
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