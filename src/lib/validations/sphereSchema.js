import { z } from 'zod'

export const sphereSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Название сферы обязательно')
    .max(50, 'Название сферы не должно превышать 50 символов')
    .refine(name => name.toLowerCase() !== 'все модели' && name.toLowerCase() !== 'без сферы', {
      message: 'Название "Все модели" и "Без сферы" зарезервированы и не могут быть использованы'
    }),
  modelIds: z
    .array(z.string().uuid('Некорректный ID модели'))
    .default([])
})
