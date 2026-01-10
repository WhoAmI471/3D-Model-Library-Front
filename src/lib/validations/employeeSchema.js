import { z } from 'zod'
import { ROLES } from '@/lib/roles'

// Список всех возможных разрешений
const ALL_PERMISSIONS_VALUES = [
  'manage_users',
  'create_projects',
  'delete_models',
  'upload_models',
  'edit_models',
  'edit_model_description',
  'edit_model_sphere',
  'edit_model_screenshots',
  'download_models',
  'edit_projects',
  'add_sphere'
]

// Базовая схема сотрудника
const baseEmployeeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Введите имя')
    .max(50, 'Имя не должно превышать 50 символов'),
  
  email: z
    .string()
    .trim()
    .min(1, 'Введите email')
    .email('Некорректный email')
    .max(50, 'Email не должен превышать 50 символов'),
  
  role: z
    .enum(Object.values(ROLES), {
      errorMap: () => ({ message: 'Выберите роль' })
    }),
  
  permissions: z
    .array(z.enum(ALL_PERMISSIONS_VALUES))
    .default([]),
  
  password: z
    .string()
    .optional()
    .or(z.literal('')),
  
  confirmPassword: z
    .string()
    .optional()
    .or(z.literal(''))
})

// Схема для создания нового сотрудника (пароль обязателен)
export const createEmployeeSchema = baseEmployeeSchema.extend({
  password: z
    .string()
    .min(1, 'Введите пароль')
    .min(6, 'Пароль должен быть не менее 6 символов')
    .max(50, 'Пароль не должен превышать 50 символов'),
  
  confirmPassword: z
    .string()
    .min(1, 'Подтвердите пароль')
}).refine((data) => {
  return data.password === data.confirmPassword
}, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword']
})

// Схема для обновления сотрудника (пароль опционален, но если указан - должен быть валидным)
export const updateEmployeeSchema = baseEmployeeSchema.superRefine((data, ctx) => {
  // Если пароль указан (не пустая строка), он должен быть валидным
  if (data.password && data.password.length > 0) {
    if (data.password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Пароль должен быть не менее 6 символов',
        path: ['password']
      })
    }
    
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Пароли не совпадают',
        path: ['confirmPassword']
      })
    }
  }
})

// Экспорт схемы по умолчанию (для обратной совместимости)
export const employeeSchema = updateEmployeeSchema
