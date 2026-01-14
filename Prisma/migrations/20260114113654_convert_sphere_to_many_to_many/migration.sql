-- Создаем промежуточную таблицу для many-to-many связи
CREATE TABLE "_ModelSpheres" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ModelSpheres_AB_pkey" PRIMARY KEY ("A","B")
);

-- Создаем индекс
CREATE INDEX "_ModelSpheres_B_index" ON "_ModelSpheres"("B");

-- Переносим существующие данные из Model.sphereId в _ModelSpheres
INSERT INTO "_ModelSpheres" ("A", "B")
SELECT "id", "sphereId"
FROM "Model"
WHERE "sphereId" IS NOT NULL;

-- Добавляем внешние ключи
ALTER TABLE "_ModelSpheres" ADD CONSTRAINT "_ModelSpheres_A_fkey" FOREIGN KEY ("A") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ModelSpheres" ADD CONSTRAINT "_ModelSpheres_B_fkey" FOREIGN KEY ("B") REFERENCES "Sphere"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Удаляем внешний ключ и колонку sphereId
ALTER TABLE "Model" DROP CONSTRAINT "Model_sphereId_fkey";

ALTER TABLE "Model" DROP COLUMN "sphereId";
