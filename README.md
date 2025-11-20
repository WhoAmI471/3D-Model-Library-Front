# 3D Model Library Front

## Быстрый старт

```bash
npm install                              # Установка зависимостей проекта
docker-compose up -d                     # Запуск Docker контейнеров (PostgreSQL, Nextcloud, MariaDB)
docker-compose ps                        # Проверка статуса контейнеров
npx prisma migrate deploy                # Применение миграций базы данных
node Prisma/scripts/seed-admin.js       # Создание администратора с всеми правами
npm run dev                              # Запуск Next.js приложения в режиме разработки
```

## Docker

```bash
docker-compose up -d                     # Запустить контейнеры в фоновом режиме
docker-compose down                      # Остановить и удалить контейнеры
docker-compose logs -f                   # Просмотр логов всех контейнеров
docker-compose logs -f nextcloud         # Просмотр логов Nextcloud
docker-compose logs -f postgres          # Просмотр логов PostgreSQL
docker-compose restart                   # Перезапустить все контейнеры
docker-compose down -v                   # Остановить контейнеры и удалить volumes (удалит данные!)
```

## Prisma

```bash
npx prisma migrate deploy                # Применить миграции (для продакшена)
npx prisma migrate dev                   # Создать и применить новую миграцию (для разработки)
npx prisma studio                        # Открыть Prisma Studio (GUI для просмотра БД)
node Prisma/scripts/seed-admin.js       # Создать администратора с всеми permissions
```

## Next.js

```bash
npm run dev                              # Запуск в режиме разработки (http://localhost:3000)
npm run build                            # Сборка проекта для продакшена
npm run start                            # Запуск продакшен версии
npm run lint                             # Проверка кода линтером
```

## Проверка портов

```bash
netstat -ano | findstr ":8080 :5432"    # Проверить, заняты ли порты 8080 и 5432
```
