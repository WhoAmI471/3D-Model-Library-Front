import { z } from 'zod'

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Введите название проекта')
    .max(50, 'Название проекта не должно превышать 50 символов'),
  
  city: z
    .string()
    .trim()
    .max(50, 'Название города не должно превышать 50 символов')
    .optional()
    .nullable()
    .default('')
    .transform(val => val || ''),
  
  modelIds: z
    .array(z.string().uuid('Некорректный ID модели'))
    .default([])
}).passthrough() // Разрешаем дополнительные поля (imageFile обрабатывается отдельно)
