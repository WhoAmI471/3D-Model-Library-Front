'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProjectForm from '@/components/ProjectForm'
import Loading from '@/components/Loading'
import { formatDateTime, proxyUrl } from '@/lib/utils'
import { checkPermission, checkAnyPermission } from '@/lib/permission'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/apiClient'
import { handleError, getErrorMessage } from '@/lib/errorHandler'
import { useNotification } from '@/hooks/useNotification'
import { useConfirm } from '@/hooks/useConfirm'
import ConfirmModal from '@/components/ConfirmModal'
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon
} from '@heroicons/react/24/outline'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 16 
  const router = useRouter()
  const { success, error: showError } = useNotification()
  const { isOpen, message, title, confirmText, cancelText, variant, showConfirm, handleConfirm, handleCancel } = useConfirm()

  // Загрузка проектов
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsData = await apiClient.projects.getAll()
        setProjects(projectsData)
        const userData = await apiClient.auth.me()
        setUser(userData.user || null)
      } catch (error) {
        await handleError(error, { context: 'ProjectsPage.fetchProjects' })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProjects()
  }, [])

  // Поиск проектов
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.city && project.city.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // Сброс страницы при изменении поиска
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Пагинация
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex)

  // Обработка добавления/обновления проекта
  const handleProjectSubmit = async (projectData) => {
    try {
      const result = currentProject
        ? await apiClient.projects.update(currentProject.id, projectData)
        : await apiClient.projects.create(projectData)
      
      if (currentProject) {
        setProjects(projects.map(proj => 
          proj.id === currentProject.id ? result : proj
        ))
        success('Проект успешно обновлен')
      } else {
        setProjects([...projects, result])
        success('Проект успешно создан')
      }
      setShowAddForm(false)
      setCurrentProject(null)
    } catch (error) {
      const formattedError = await handleError(error, { context: 'ProjectsPage.handleProjectSubmit', projectId: currentProject?.id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
      throw error
    }
  }

  // Обработка удаления проекта
  const handleDelete = async (project, e) => {
    e.stopPropagation()
    
    const confirmed = await showConfirm({
      message: `Вы уверены, что хотите удалить проект "${project.name}"?`,
      variant: 'danger',
      confirmText: 'Удалить'
    })
    
    if (!confirmed) return
    
    const id = project.id

    try {
      await apiClient.projects.delete(id)
      setProjects(projects.filter(proj => proj.id !== id))
      success('Проект успешно удален')
    } catch (error) {
      const formattedError = await handleError(error, { context: 'ProjectsPage.handleDelete', projectId: id })
      const errorMessage = getErrorMessage(formattedError)
      showError(errorMessage)
    }
  }

  const handleEdit = (project, e) => {
    e.stopPropagation()
    setCurrentProject(project)
    setShowAddForm(true)
  }

  const handleAdd = () => {
    setCurrentProject(null)
    setShowAddForm(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loading />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Проекты</h1>
        <div className="mb-8">
          {/* Поиск и кнопка добавления */}
          <div className="mb-6 flex gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию или городу..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {(user?.role === 'ADMIN' || checkPermission(user, 'create_projects')) && (
              <button 
                onClick={handleAdd}
                className="group relative inline-flex items-center h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium cursor-pointer overflow-hidden"
                style={{ 
                  width: '2.5rem', 
                  paddingLeft: '0.625rem', 
                  paddingRight: '0.625rem',
                  transition: 'width 0.2s, padding-right 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.setProperty('width', '195px', 'important')
                  e.currentTarget.style.setProperty('padding-right', '2rem', 'important')
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.setProperty('width', '2.5rem', 'important')
                  e.currentTarget.style.setProperty('padding-right', '0.625rem', 'important')
                }}
                title="Добавить проект"
              >
                <PlusIcon className="h-5 w-5 flex-shrink-0" style={{ color: '#ffffff', strokeWidth: 2 }} />
                <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Добавить проект
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Форма проекта */}
        {showAddForm && (
          <ProjectForm
            project={currentProject}
            onSubmit={handleProjectSubmit}
            onCancel={() => {
              setShowAddForm(false)
              setCurrentProject(null)
            }}
          />
        )}

        {/* Сетка проектов */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              {searchTerm
                ? 'Проекты не найдены'
                : 'Нет проектов'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Очистить поиск
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-gray-300 flex flex-col"
              >
                {/* Изображение проекта */}
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="block h-48 bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer overflow-hidden"
                >
                  {project.imageUrl ? (
                    <img
                      src={proxyUrl(project.imageUrl)}
                      alt={project.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.parentElement.innerHTML = '<div class="flex items-center justify-center h-full"><svg class="h-16 w-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg></div>'
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FolderIcon className="h-16 w-16 text-blue-600" />
                    </div>
                  )}
                </Link>

                {/* Контент карточки */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex-1">
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="block"
                    >
                      <h3 className="font-semibold text-gray-900 mb-2 truncate hover:text-blue-600 transition-colors cursor-pointer" title={project.name}>
                        {project.name}
                      </h3>
                    </Link>
                    
                    <div className="space-y-2">
                      {project.city && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="truncate">{project.city}</span>
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        Моделей: {project.models?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-4">
                    <span className="text-xs text-gray-500">
                      {formatDateTime(project.createdAt)}
                    </span>
                    {(user?.role === 'ADMIN' || checkAnyPermission(user, 'create_projects', 'edit_projects')) && (
                      <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                        <Link
                          href="#"
                          onClick={(e) => handleEdit(project, e)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Редактировать"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={(e) => handleDelete(project, e)}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Удалить"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              ))}
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
                  >
                    Назад
                  </button>
                  <div className="flex items-center px-4 text-sm text-gray-600">
                    Страница {currentPage} из {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={isOpen}
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        variant={variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  )
}
