const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Начинаем удаление сферы "Без сферы"...')
  
  try {
    // Находим сферу "Без сферы"
    const noSphere = await prisma.sphere.findUnique({
      where: { name: 'Без сферы' },
      include: {
        models: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!noSphere) {
      console.log('Сфера "Без сферы" не найдена в базе данных.')
      return
    }

    console.log(`Найдена сфера "Без сферы" с ID: ${noSphere.id}`)
    console.log(`Количество связанных моделей: ${noSphere.models.length}`)

    if (noSphere.models.length > 0) {
      console.log('\nПредупреждение: К сфере "Без сферы" привязаны модели:')
      noSphere.models.forEach(model => {
        console.log(`  - ${model.title} (${model.id})`)
      })
      console.log('\nУдаляем связи моделей со сферой "Без сферы"...')
      
      // Удаляем все связи моделей со сферой "Без сферы"
      for (const model of noSphere.models) {
        await prisma.model.update({
          where: { id: model.id },
          data: {
            spheres: {
              disconnect: { id: noSphere.id }
            }
          }
        })
      }
      
      console.log('Все связи удалены.')
    }

    // Удаляем сферу
    await prisma.sphere.delete({
      where: { id: noSphere.id }
    })

    console.log('\n✅ Сфера "Без сферы" успешно удалена из базы данных!')
  } catch (error) {
    console.error('Ошибка при удалении сферы "Без сферы":', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
