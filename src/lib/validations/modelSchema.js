import { z } from 'zod'

// Валидация ZIP файла
const zipFileSchema = z
  .instanceof(File)
  .refine(
    (file) => {
      const fileName = file.name.toLowerCase()
      return fileName.endsWith('.zip')
    },
    { message: 'Можно загружать только .zip файлы' }
  )
  .optional()
  .nullable()

// Валидация изображения
const imageFileSchema = z
  .instanceof(File)
  .refine(
    (file) => {
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
      if (!validMimeTypes.includes(file.type?.toLowerCase())) {
        return false
      }
      
      const fileName = file.name.toLowerCase()
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
      return validExtensions.some(ext => fileName.endsWith(ext))
    },
    { message: 'Разрешены только изображения: JPG, PNG, GIF, WEBP, BMP' }
  )

// Схема для объекта скриншота (с preview и file)
const screenshotSchema = z.object({
  preview: z.string(),
  file: imageFileSchema
})

// Базовая схема модели
const baseModelSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Введите название модели')
    .max(50, 'Название модели не должно превышать 50 символов')
    .refine(
      (val) => /^[a-zA-Zа-яА-ЯёЁ0-9\s.,\-_():;]*$/.test(val),
      { message: 'Название содержит недопустимые символы' }
    ),
  
  description: z
    .string()
    .trim()
    .max(5000, 'Описание не должно превышать 5000 символов')
    .refine(
      (val) => !val || /^[a-zA-Zа-яА-ЯёЁ0-9\s.,\-_():;]*$/.test(val),
      { message: 'Описание содержит недопустимые символы' }
    )
    .optional()
    .nullable()
    .default(''),
  
  authorId: z
    .string()
    .uuid('Некорректный ID автора')
    .optional()
    .nullable(),
  
  version: z
    .string()
    .min(1, 'Введите версию')
    .max(20, 'Версия не должна превышать 20 символов')
    .regex(/^[\d.]+$/, 'Версия должна содержать только цифры и точки')
    .default('1.0'),
  
  sphereId: z
    .string()
    .uuid('Некорректный ID сферы')
    .min(1, 'Выберите сферу'),
  
  projectIds: z
    .array(z.string().uuid('Некорректный ID проекта'))
    .default([])
})

// Схема для загрузки новой модели (только текстовые поля, файлы валидируются отдельно)
export const createModelSchema = baseModelSchema.passthrough()

// Схема для валидации файлов (используется вручную в компоненте)
export const validateModelFiles = (zipFile, screenshots) => {
  const errors = {}
  
  if (!zipFile) {
    errors.zipFile = 'Загрузите ZIP-архив модели'
  } else {
    const fileName = zipFile.name.toLowerCase()
    if (!fileName.endsWith('.zip')) {
      errors.zipFile = 'Можно загружать только .zip файлы'
    }
  }
  
  if (!screenshots || screenshots.length < 2) {
    errors.screenshots = 'Добавьте минимум 2 скриншота'
  }
  
  return errors
}

// Схема для обновления модели (все поля опциональны, кроме базовых)
export const updateModelSchema = baseModelSchema.partial({
  title: true,
  description: true,
  authorId: true,
  version: true,
  sphereId: true,
  projectIds: true
}).extend({
  zipFile: zipFileSchema,
  
  screenshots: z
    .array(screenshotSchema)
    .optional()
    .default([]),
  
  deletedScreenshots: z
    .array(z.string())
    .optional()
    .default([])
}).refine((data) => {
  // Если обновляется title, он должен быть валидным
  if (data.title !== undefined && data.title.length > 0) {
    return data.title.length <= 50 && /^[a-zA-Zа-яА-ЯёЁ0-9\s.,\-_():;]*$/.test(data.title)
  }
  return true
}, {
  message: 'Название модели содержит недопустимые символы или слишком длинное',
  path: ['title']
})
