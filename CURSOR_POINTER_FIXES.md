# Список кнопок для добавления cursor-pointer

## Компоненты форм

### `src/components/modelForm/FormActions.jsx`
- **Кнопка "Назад"** (строка 20-27)
  - Текущий класс: `"flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"`
  - Добавить: `cursor-pointer`

- **Кнопка "Отмена"** (строка 32-39)
  - Текущий класс: `"px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"`
  - Добавить: `cursor-pointer`

- **Кнопка "Сохранить"** (строка 41-60)
  - Текущий класс: условный, но при `!isSubmitting` нужно добавить `cursor-pointer`
  - Добавить: `cursor-pointer` (когда не disabled)

### `src/components/DeleteReasonModal.jsx`
- **Кнопка "Отмена"** (строка 82-88)
  - Текущий класс: `"px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"`
  - Добавить: `cursor-pointer`

- **Кнопка "Отправить запрос"** (строка 89-94)
  - Текущий класс: `"px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"`
  - Добавить: `cursor-pointer`

### `src/app/(auth)/login/page.js`
- **Кнопка "Войти"** (строка 85-90)
  - Текущий класс: `"w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg transition-colors text-sm font-medium"`
  - Добавить: `cursor-pointer`

### `src/components/ErrorBoundary.jsx`
- **Кнопка "Попробовать снова"** (строка 96-101)
  - Текущий класс: `"flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"`
  - Добавить: `cursor-pointer`

- **Кнопка "Обновить страницу"** (строка 102-107)
  - Текущий класс: `"flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"`
  - Добавить: `cursor-pointer`

## Компоненты моделей

### `src/components/modelForm/ScreenshotsUploadSection.jsx`
- **Кнопка удаления скриншота** (строка 103-113)
  - Текущий класс: `"absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors z-10"`
  - Добавить: `cursor-pointer`

### `src/components/modelForm/ScreenshotsSection.jsx`
- **Кнопка удаления текущего скриншота** (строка 124-134)
  - Текущий класс: `"absolute top-2 right-2 p-1 rounded-full bg-white text-gray-700 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors z-10"`
  - Добавить: `cursor-pointer`

- **Кнопка удаления нового скриншота** (строка 175-185)
  - Текущий класс: аналогичный предыдущему
  - Добавить: `cursor-pointer`

- **Кнопка восстановления удаленного скриншота** (строка 228-232)
  - Текущий класс: нужно проверить
  - Добавить: `cursor-pointer`

### `src/components/ModelCard.jsx`
- **Кнопка закрытия модального окна изображений** (строка 275-278)
  - Текущий класс: `"absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"`
  - Добавить: `cursor-pointer`

- **Кнопка "Предыдущее изображение"** (строка 292-297)
  - Текущий класс: `"absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"`
  - Добавить: `cursor-pointer`

- **Кнопка "Следующее изображение"** (строка 299-304)
  - Текущий класс: `"absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"`
  - Добавить: `cursor-pointer`

- **Кнопка выбора изображения в галерее** (строка 312-316)
  - Текущий класс: условный с `bg-white` или `bg-white/50`
  - Добавить: `cursor-pointer`

### `src/components/ModelPreview.jsx`
- **Кнопка "Предыдущее изображение"** (строка 97-104)
  - Добавить: `cursor-pointer`

- **Кнопка "Следующее изображение"** (строка 105-112)
  - Добавить: `cursor-pointer`

- **Кнопка закрытия превью** (строка 118-123)
  - Добавить: `cursor-pointer`

## Страницы дашборда

### `src/app/dashboard/page.js`
- **Кнопка пагинации "Назад"** (строка 410-415)
  - Добавить: `cursor-pointer`

- **Кнопка пагинации "Вперед"** (строка 420-425)
  - Добавить: `cursor-pointer`

### `src/app/dashboard/projects/page.js`
- **Кнопка пагинации "Назад"** (строка 305-310)
  - Добавить: `cursor-pointer`

- **Кнопка пагинации "Вперед"** (строка 315-320)
  - Добавить: `cursor-pointer`

### `src/app/dashboard/projects/[id]/page.js`
- **Кнопка "Очистить фильтры"** (строка 272-276)
  - Добавить: `cursor-pointer`

### `src/app/dashboard/spheres/page.js`
- **Кнопка "Очистить фильтры"** (строка 248-252)
  - Добавить: `cursor-pointer`

### `src/app/dashboard/employees/page.js`
- **Кнопка "Очистить фильтры"** (строка 271-275)
  - Добавить: `cursor-pointer`

## Компоненты модальных окон

### `src/components/ProjectForm.jsx`
- **Кнопка удаления изображения проекта** (строка 236-240)
  - Добавить: `cursor-pointer`

- **Кнопка "Добавить модель"** (строка 283-287)
  - Добавить: `cursor-pointer`

- **Кнопка пагинации "Назад"** (строка 428-433)
  - Добавить: `cursor-pointer`

- **Кнопка пагинации "Вперед"** (строка 438-443)
  - Добавить: `cursor-pointer`

### `src/components/AddModelsToProjectModal.jsx`
- **Кнопка закрытия модального окна** (строка 88-92)
  - Добавить: `cursor-pointer`

- **Кнопка "Добавить модель"** (строка 110-115)
  - Добавить: `cursor-pointer`

- **Кнопка выбора модели** (строка 203-210)
  - Добавить: `cursor-pointer`

- **Кнопка пагинации** (строка 255)
  - Добавить: `cursor-pointer`

### `src/components/ProjectFilter.jsx`
- **Кнопка закрытия фильтра** (строка 43-47)
  - Добавить: `cursor-pointer`

- **Кнопка применения фильтра** (строка 97-102)
  - Добавить: `cursor-pointer`

## Компоненты уведомлений

### `src/components/Notification.jsx`
- **Кнопка закрытия уведомления** (строка 149-153)
  - Добавить: `cursor-pointer`

### `src/components/Toast.jsx`
- **Кнопка закрытия тоста** (строка 47-51)
  - Добавить: `cursor-pointer`

## Компоненты форм редактирования

### `src/components/ModelEditForm.jsx`
- **Кнопка "Попробовать снова"** (строка 622-627)
  - Добавить: `cursor-pointer`

- **Кнопка "Назад"** (строка 640-645)
  - Добавить: `cursor-pointer`

- **Кнопка восстановления удаленного скриншота** (строка 884-890)
  - Добавить: `cursor-pointer`

- **Кнопка удаления ZIP-файла** (строка 955-961)
  - Добавить: `cursor-pointer`

- **Кнопка "Отмена"** (строка 1003-1008)
  - Добавить: `cursor-pointer`

- **Кнопка "Сохранить"** (строка 1011)
  - Добавить: `cursor-pointer`

### `src/components/ModelUploadForm.jsx`
- **Кнопка "Назад"** (строка 322-328)
  - Добавить: `cursor-pointer`

- **Кнопка "Отмена"** (строка 454-460)
  - Добавить: `cursor-pointer`

- **Кнопка "Загрузить модель"** (строка 462)
  - Добавить: `cursor-pointer`

### `src/components/EmployeeForm.jsx`
- **Кнопка "Отмена"** (строка 255-260)
  - Добавить: `cursor-pointer`

- **Кнопка переключения изменения пароля** (строка 329-335)
  - Добавить: `cursor-pointer`

- **Кнопка "Отмена"** (строка 512-518)
  - Добавить: `cursor-pointer`

- **Кнопка "Сохранить"** (строка 520)
  - Добавить: `cursor-pointer`

## Заголовок

### `src/components/MainHeader.jsx`
- **Кнопка "Выйти"** (строка 131-137)
  - Добавить: `cursor-pointer`

## Примечания

- Все кнопки с `onClick` должны иметь `cursor-pointer`
- Кнопки в состоянии `disabled` должны иметь `cursor-not-allowed` вместо `cursor-pointer`
- Кнопки-ссылки (`<Link>`) обычно не требуют `cursor-pointer`, так как это поведение по умолчанию для ссылок
