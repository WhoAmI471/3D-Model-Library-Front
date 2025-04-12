import AddModelButton from '@/components/AddModelButton'

export default function ModelsPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Все модели</h1>
        <AddModelButton />
      </div>

      {/* Здесь будет список моделей */}
    </div>
  )
}
