'use client'

/**
 * Компонент для выбора проектов модели
 */
export default function ProjectsSection({
  projects = [],
  selectedProjects = [],
  onToggleProject,
  searchTerm = '',
  onSearchChange,
  disabled = false
}) {
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="mb-8">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Проекты</div>
      
      {/* Поиск проектов */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Поиск проектов..."
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          maxLength={50}
          disabled={disabled}
        />
      </div>
      
      {/* Список проектов */}
      <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-white border border-gray-200 rounded-lg">
        {filteredProjects.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">Проекты не найдены</p>
        ) : (
          filteredProjects.map(project => (
            <div key={project.id} className="flex items-center">
              <input
                type="checkbox"
                id={`project-${project.id}`}
                checked={selectedProjects.includes(project.id)}
                onChange={() => onToggleProject(project.id)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                disabled={disabled}
              />
              <label htmlFor={`project-${project.id}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                {project.name}{project.city ? ` • ${project.city}` : ''}
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

