'use client'

/**
 * Компонент для выбора сфер модели
 */
export default function SpheresSection({
  spheres = [],
  selectedSpheres = [],
  onToggleSphere,
  searchTerm = '',
  onSearchChange,
  disabled = false
}) {
  const filteredSpheres = spheres.filter(sphere =>
    sphere.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="mb-8">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Сферы</div>
      
      {/* Поиск сфер */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Поиск сфер..."
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          maxLength={50}
          disabled={disabled}
        />
      </div>
      
      {/* Список сфер */}
      <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-white border border-gray-200 rounded-lg">
        {filteredSpheres.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">Сферы не найдены</p>
        ) : (
          filteredSpheres.map(sphere => (
            <div key={sphere.id} className="flex items-center">
              <input
                type="checkbox"
                id={`sphere-${sphere.id}`}
                checked={selectedSpheres.includes(sphere.id)}
                onChange={() => onToggleSphere(sphere.id)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                disabled={disabled}
              />
              <label htmlFor={`sphere-${sphere.id}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                {sphere.name}
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
