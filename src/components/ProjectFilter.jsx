import { useState } from 'react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

// Компонент фильтра проектов
export const ProjectFilter = ({ 
    projects, 
    selectedProjects, 
    onToggleProject, 
    onClose,
    searchTerm,
    onSearchChange
  }) => {
    const filteredProjects = projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const [mouseDownTarget, setMouseDownTarget] = useState(null)

    const handleOverlayMouseDown = (e) => {
      setMouseDownTarget(e.target)
    }

    const handleOverlayClick = (e) => {
      if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
        onClose()
      }
      setMouseDownTarget(null)
    }

    return (
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-start justify-center z-50 pt-20 px-4"
        onMouseDown={handleOverlayMouseDown}
        onClick={handleOverlayClick}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[calc(100vh-8rem)] flex flex-col"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {/* Заголовок */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Фильтр по проектам</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Поиск */}
          <div className="p-5 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск проектов..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>

          {/* Список проектов */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredProjects.length > 0 ? (
              <div className="space-y-1">
                {filteredProjects.map(project => (
                  <label
                    key={project.id}
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => onToggleProject(project.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-3 text-sm text-gray-700 font-medium">
                      {project.name}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">Проекты не найдены</p>
              </div>
            )}
          </div>

          {/* Футер */}
          {selectedProjects.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  selectedProjects.forEach(id => onToggleProject(id))
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                Очистить все ({selectedProjects.length})
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }