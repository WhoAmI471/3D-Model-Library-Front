-- Создаем расширение для UUID если его нет (для старых версий PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создаем временную таблицу SphereTable (чтобы избежать конфликта с enum)
CREATE TABLE "SphereTable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SphereTable_pkey" PRIMARY KEY ("id")
);

-- Создаем уникальный индекс
CREATE UNIQUE INDEX "SphereTable_name_key" ON "SphereTable"("name");

-- Заполняем таблицу SphereTable русскими названиями
INSERT INTO "SphereTable" ("id", "name", "createdAt") VALUES
    (uuid_generate_v4()::text, 'Строительство', NOW()),
    (uuid_generate_v4()::text, 'Химия', NOW()),
    (uuid_generate_v4()::text, 'Промышленность', NOW()),
    (uuid_generate_v4()::text, 'Медицина', NOW()),
    (uuid_generate_v4()::text, 'Другое', NOW());

-- Добавляем новую колонку sphereId
ALTER TABLE "Model" ADD COLUMN "sphereId" TEXT;

-- Переносим данные: маппим enum значения на русские названия
UPDATE "Model" SET "sphereId" = (SELECT "id" FROM "SphereTable" WHERE "name" = 'Строительство')
WHERE "sphere" = 'CONSTRUCTION';

UPDATE "Model" SET "sphereId" = (SELECT "id" FROM "SphereTable" WHERE "name" = 'Химия')
WHERE "sphere" = 'CHEMISTRY';

UPDATE "Model" SET "sphereId" = (SELECT "id" FROM "SphereTable" WHERE "name" = 'Промышленность')
WHERE "sphere" = 'INDUSTRIAL';

UPDATE "Model" SET "sphereId" = (SELECT "id" FROM "SphereTable" WHERE "name" = 'Медицина')
WHERE "sphere" = 'MEDICAL';

UPDATE "Model" SET "sphereId" = (SELECT "id" FROM "SphereTable" WHERE "name" = 'Другое')
WHERE "sphere" = 'OTHER';

-- Удаляем старую колонку sphere
ALTER TABLE "Model" DROP COLUMN "sphere";

-- Удаляем enum
DROP TYPE "Sphere";

-- Переименовываем таблицу в Sphere
ALTER TABLE "SphereTable" RENAME TO "Sphere";

-- Переименовываем индексы и ограничения
ALTER INDEX "SphereTable_pkey" RENAME TO "Sphere_pkey";
ALTER INDEX "SphereTable_name_key" RENAME TO "Sphere_name_key";

-- Добавляем внешний ключ (после переименования)
ALTER TABLE "Model" ADD CONSTRAINT "Model_sphereId_fkey" FOREIGN KEY ("sphereId") REFERENCES "Sphere"("id") ON DELETE SET NULL ON UPDATE CASCADE;
