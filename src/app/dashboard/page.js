'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkPermission } from '@/lib/permission'
import axios from 'axios'
import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence } from 'framer-motion'
import { ProjectFilter } from "@/components/ProjectFilter"
import { ModelPreview } from "@/components/ModelPreview"

import Download from "../../../public/Download.svg"
import Delete from "../../../public/Delete.svg"
import Edit from "../../../public/Edit.svg"


export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [models, setModels] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProjects, setSelectedProjects] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [projectSearchTerm, setProjectSearchTerm] = useState('')

  const [previewModel, setPreviewModel] = useState(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [showPreview, setShowPreview] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [autoPlayInterval, setAutoPlayInterval] = useState(null)

  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const userRes = await axios.get('/api/auth/me')
        setUser(userRes.data.user)

        const modelsRes = await axios.get('/api/models')
        setModels(modelsRes.data)

        const projectsRes = await axios.get('/api/projects')
        setProjects(projectsRes.data)
      } catch (err) {
        router.push('/login')
      }
    }

    load()
  }, [])

  const handleDownload = async (model) => {
    setIsDownloading(true)
    try {
      const response = await fetch(model.fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${model.title}.zip` || 'model.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Ошибка при скачивании:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDeleteRequest = async (model) => {
    if (user?.role === 'ADMIN') {
      if (confirm('Вы уверены, что хотите удалить эту модель?')) {
        try {
          const response = await fetch(`/api/models/${model.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ approve: true })
          });
          
          const data = await response.json();
          
          if (response.ok) {
            setModels(prev => prev.filter(m => m.id !== model.id));
            alert('Модель успешно удалена');
          } else {
            throw new Error(data.error || 'Ошибка при удалении');
          }
        } catch (error) {
          console.error('Ошибка при удалении:', error);
          alert(error.message);
        }
      }
    } else {
      if (confirm('Отправить запрос на удаление администратору?')) {
        try {
          // Для обычных пользователей - PUT запрос для пометки на удаление
          const response = await axios.put(`/api/models/${model.id}`, {
            action: 'REQUEST_DELETE'
          });
          
          if (response.status === 200) {
            alert(response.data.message);
          } else {
            throw new Error(response.data.error || 'Ошибка при отправке запроса');
          }
        } catch (error) {
          console.error('Ошибка:', error);
          alert(error.message);
        }
      }
    }
  }

  const handleMouseMove = (event) => {
    if (isHovering) {
      updatePreviewPosition(event)
    }
  }

  const updatePreviewPosition = (event) => {
    const x = Math.min(event.clientX + 20, window.innerWidth - 340)
    const y = Math.min(event.clientY + 20, window.innerHeight - 260)
    setPreviewPosition({ x, y })
  }

  const nextImage = () => {
    if (!previewModel || !previewModel.images?.length) return
    
    setCurrentImageIndex(prev => 
      prev === previewModel.images.length - 1 ? 0 : prev + 1
    )
  }

  const prevImage = () => {
    if (!previewModel || !previewModel.images?.length) return
    
    setCurrentImageIndex(prev => 
      prev === 0 ? previewModel.images.length - 1 : prev - 1
    )
  }

  const startAutoPlay = () => {
    if (!previewModel || !previewModel.images?.length) return
    
    stopAutoPlay()
    
    const interval = setInterval(() => {
      if (!previewModel || !previewModel.images?.length) {
        stopAutoPlay()
        return
      }
      nextImage()
    }, 2000)
    
    setAutoPlayInterval(interval)
  }

  const stopAutoPlay = () => {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval)
      setAutoPlayInterval(null)
    }
  }

  const handleWheel = (e) => {
    if (!previewModel || !previewModel.images?.length) return
    
    e.preventDefault()
    if (e.deltaY > 0) {
      nextImage()
    } else {
      prevImage()
    }
  }

  const handleMouseEnter = (model, event) => {
    if (model?.images?.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect()
      setPreviewPosition({
        x: rect.right + 10, // Позиция справа от строки
        y: rect.top
      })
      setPreviewModel(model)
      setCurrentImageIndex(0)
      setShowPreview(true)
      startAutoPlay()
    }
  }
  
  const handleMouseLeave = () => {
    setShowPreview(false)
    setPreviewModel(null)
    stopAutoPlay()
  }
  useEffect(() => {
    return () => {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval)
      }
    }
  }, [autoPlayInterval])

  const handleUpload = async () => {
    router.push('/dashboard/models/upload')
  }

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const filteredModels = models
  .filter(model => 
    selectedProjects.length === 0 || 
    model.projects?.some(project => selectedProjects.includes(project.id)))
  .filter(model => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      model.title?.toLowerCase().includes(searchLower) ||
      (model.author?.name?.toLowerCase().includes(searchLower)) ||
      (model.projects?.some(p => p.name.toLowerCase().includes(searchLower)))
    )
  })
    

  const sortedModels = [...filteredModels].sort((a, b) => {
    if (sortConfig.key) {
      const keys = sortConfig.key.split('.')
      let valueA = a
      let valueB = b
      
      for (const key of keys) {
        valueA = valueA?.[key]
        valueB = valueB?.[key]
      }

      if (valueA < valueB) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (valueA > valueB) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
    }
    return 0
  })

  const toggleProjectFilter = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800" onMouseMove={handleMouseMove}>
      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Модели</h2>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowProjectFilter(!showProjectFilter)}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Фильтр
            </button>
            
            {checkPermission(user?.role, 'edit_models') && (
              <button 
                onClick={handleUpload}
                className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Добавить модель
              </button>)
            }
          </div>
        </div>

        <div className="mb-6">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Найти модель по названию или автору"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {showProjectFilter && (
          <ProjectFilter
            projects={projects}
            selectedProjects={selectedProjects}
            onToggleProject={toggleProjectFilter}
            onClose={() => setShowProjectFilter(false)}
            searchTerm={projectSearchTerm}
            onSearchChange={setProjectSearchTerm}
          />
        )}

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('title')}
                >
                  <div className="flex items-center">
                    Название
                    {getSortIcon('title')}
                  </div>
                </th>
                <th 
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('project.name')}
                >
                  <div className="flex items-center">
                    Проект
                    {getSortIcon('project.name')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Автор
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedModels.map((model) => (
                <tr 
                  key={model.id} 
                  className="hover:bg-gray-50 odd:bg-blue-50 even:bg-white"
                  onMouseEnter={(e) => handleMouseEnter(model, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  <td 
                    className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900" 
                    onClick={() => router.push(`/dashboard/models/${model.id}`)}>
                    {/* <Link href={`/dashboard/models/${model.id}`}> */}
                      {model.title}
                    {/* </Link> */}
                  </td>
                  <td 
                    className="px-6 py-2 whitespace-nowrap text-sm text-gray-500" 
                    onClick={() => router.push(`/dashboard/models/${model.id}`)}>
                    {model.projects?.length > 0 ? model.projects.map(p => p.name).join(', ') : '—'}
                  </td>
                  <td 
                    className="px-6 py-2 whitespace-nowrap text-sm text-gray-500" 
                    onClick={() => router.push(`/dashboard/models/${model.id}`)}>
                    {model.author?.name || '—'}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium" >
                    <div className="flex justify-end space-x-3">
                      {(checkPermission(user?.role, 'edit_models') || checkPermission(user?.role, 'edit_model_description')) && (
                        <Link href={`/dashboard/models/update/${model.id}`}>
                          <button className="text-yellow-600 hover:text-yellow-900">
                            <Image 
                              src={Edit} 
                              alt="Edit" 
                              width={20} 
                              height={20}
                              className='mt-1'
                            />
                          </button>
                        </Link>)
                      }
                      
                      {checkPermission(user?.role, 'delete_models') && (
                        <button 
                          onClick={() => handleDeleteRequest(model)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Image 
                            src={Delete} 
                            alt="Delete" 
                            width={20} 
                            height={20}
                          />
                        </button>)
                      }
                      
                      {checkPermission(user?.role, 'download_models') && (
                        <button 
                          className="text-blue-600 hover:text-blue-900" 
                          onClick={() => handleDownload(model)}
                        >
                          <Image 
                            src={Download} 
                            alt="Download" 
                            width={19} 
                            height={19}
                          />
                        </button>)
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AnimatePresence>
          {showPreview && previewModel && (
            <ModelPreview
              model={previewModel}
              position={previewPosition}
              currentImageIndex={currentImageIndex}
              onNextImage={nextImage}
              onPrevImage={prevImage}
              onWheel={handleWheel}
              isHovering={isHovering}
              setIsHovering={setShowPreview}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}