import { z } from 'zod'

export const sphereSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Название сферы обязательно')
    .max(100, 'Название сферы не должно превышать 100 символов')
})
