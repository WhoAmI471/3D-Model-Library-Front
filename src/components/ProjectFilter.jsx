import { useState } from 'react'

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
      // Запоминаем элемент, на котором началось нажатие
      setMouseDownTarget(e.target)
    }

    const handleOverlayClick = (e) => {
      // Закрываем только если клик начался и закончился на overlay, а не на дочернем элементе
      if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
        onClose()
      }
      setMouseDownTarget(null)
    }

    return (
      <div 
        className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
        onMouseDown={handleOverlayMouseDown}
        onClick={handleOverlayClick}
      >
        <div 
          className="bg-white rounded-lg shadow-xl w-full max-w-md"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4">
            <h3 className="text-lg font-medium">Фильтр по проектам</h3>
            <div className="mt-2 relative">
              <input
                type="text"
                placeholder="Поиск проектов..."
                className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>
          <div className="p-4 m-4 max-h-96 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
            {filteredProjects.length > 0 ? (
              filteredProjects.map(project => (
                <div key={project.id} className="flex items-center py-2">
                  <input
                    type="checkbox"
                    id={`project-${project.id}`}
                    checked={selectedProjects.includes(project.id)}
                    onChange={() => onToggleProject(project.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor={`project-${project.id}`} className="ml-3 block text-gray-700">
                    {project.name}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Проекты не найдены</p>
            )}
          </div>
          <div className="p-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    )
  }