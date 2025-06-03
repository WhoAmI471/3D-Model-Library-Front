'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { checkPermission } from '@/lib/permission';
// import { FolderIcon, CubeIcon, UsersIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import axios from 'axios'
import Link from 'next/link'
import Image from 'next/image'

import Download from "../../../public/Download.svg"
import Delete from "../../../public/Delete.svg"
import Edit from "../../../public/Edit.svg"
import { motion, AnimatePresence } from 'framer-motion';


export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [models, setModels] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProjects, setSelectedProjects] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('')

  const [previewModel, setPreviewModel] = useState(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [autoPlayInterval, setAutoPlayInterval] = useState(null);

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
    setIsDownloading(true);
    try {
      const response = await fetch(model.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model.title}.zip` || 'model.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Ошибка при скачивании:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteRequest = async (model) => {
    if (user.role === 'ADMIN') {
      if (confirm('Вы уверены, что хотите удалить эту модель?')) {
        const result = await onDeleteRequest(model.id, true);
        if (result?.success && result.redirect) {
          router.push(result.redirect);
        }
      }
    } else {
      if (confirm('Отправить запрос на удаление администратору?')) {
        try {
          const response = await fetch(`/api/models/${model.id}`, {
            method: 'PUT'
          });
          
          const result = await response.json();
          
          if (response.ok) {
            alert(result.message);
            router.refresh(); // Обновляем страницу
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          alert(error.message);
        }
      }
    }
  };

  const handleLogout = async () => {
    await axios.post('/api/auth/logout')
    router.push('/login')
  }
  
  const handleMouseMove = (event) => {
    if (isHovering) {
      updatePreviewPosition(event);
    }
  };

  const updatePreviewPosition = (event) => {
    const x = Math.min(event.clientX + 20, window.innerWidth - 340); // 320px + отступы
    const y = Math.min(event.clientY + 20, window.innerHeight - 260); // 240px + отступы
    setPreviewPosition({ x, y });
  };
  // Переключение изображений
  const nextImage = () => {
    setCurrentImageIndex(prev => 
      prev === previewModel.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => 
      prev === 0 ? previewModel.images.length - 1 : prev - 1
    );
  };

  // Автопереключение каждые 5 секунд
  const startAutoPlay = () => {
    if (autoPlayInterval) clearInterval(autoPlayInterval);
    const interval = setInterval(nextImage, 5000);
    setAutoPlayInterval(interval);
  };

  const stopAutoPlay = () => {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      setAutoPlayInterval(null);
    }
  };

  // Обработчик колесика мыши
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      nextImage();
    } else {
      prevImage();
    }
  };

  const handleMouseEnter = (model, event) => {
    if (model?.images?.length > 0) {  // Добавлена проверка на существование
      setPreviewModel(model);
      setCurrentImageIndex(0);
      setIsHovering(true);
      updatePreviewPosition(event);
      startAutoPlay();
    }
  };
  
  const handleMouseLeave = () => {
    setIsHovering(false);
    setPreviewModel(null);
    stopAutoPlay();
  };

  useEffect(() => {
    return () => {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
      }
    };
  }, [autoPlayInterval]);

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
        (model.projects?.some(p => p.name.toLowerCase().includes(searchLower))))
    })
    

  // Сортировка
  const sortedModels = [...filteredModels].sort((a, b) => {
    if (sortConfig.key) {
      // Для вложенных свойств (например, author.name)
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
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Модели</h2>
          <div className="flex gap-4">
            {/* Кнопка фильтра */}
            <button 
              onClick={() => setShowProjectFilter(!showProjectFilter)}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Фильтр
            </button>
            
            {/* Кнопка добавления */}
            {checkPermission(user?.role, 'edit_models') && (
              <button 
                onClick={handleUpload}
                className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 shadow-sm "
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Добавить модель
              </button>)
            }
          </div>
        </div>

        {/* Поиск */}
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

        {/* Модальное окно фильтра */}
        {showProjectFilter && (
          <div 
            className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50"
            onClick={() => setShowProjectFilter(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4">
                <h3 className="text-lg font-medium">Фильтр по проектам</h3>
              </div>
              <div className="p-4 m-4 max-h-96 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                {projects.map(project => (
                  <div key={project.id} className="flex items-center py-2">
                    <input
                      type="checkbox"
                      id={`project-${project.id}`}
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => toggleProjectFilter(project.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor={`project-${project.id}`} className="ml-3 block text-gray-700">
                      {project.name}
                    </label>
                  </div>
                ))}
              </div>
              <div className="p-4 flex justify-end">
                <button
                  onClick={() => setShowProjectFilter(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Таблица */}
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
              {filteredModels.map((model) => (
                <tr 
                  key={model.id} 
                  className="hover:bg-gray-50 odd:bg-blue-50 even:bg-white"
                  onMouseEnter={(e) => handleMouseEnter(model, e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}>

                  <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link href={`/dashboard/models/${model.id}`}>
                      {model.title}
                    </Link>
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                    {model.projects?.length > 0 ? model.projects.map(p => p.name).join(', ') : '—'}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                    {model.author?.name || '—'}
                  </td>
                  <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
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
                            {/* Редактировать */}
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
                          {/* Удалить */}
                        </button>)
                      }
                      
                      {checkPermission(user?.role, 'download_models') && (
                        <button 
                          className="text-blue-600 hover:text-blue-900" 
                          onClick={() => handleDownload(model)}>
                          <Image 
                            src={Download} 
                            alt="Download" 
                            width={19} 
                            height={19}
                          />
                          {/* Открыть */}
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
          {previewModel && isHovering && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed z-50 bg-white shadow-lg rounded-md overflow-hidden border border-gray-200 pointer-events-auto"
              style={{
                left: `${previewPosition.x}px`,
                top: `${previewPosition.y}px`,
                width: '320px',
                height: '240px'
              }}
              onWheel={handleWheel}
            >
              <div className="relative w-full h-full">
                <Image
                  src={previewModel.images[currentImageIndex]}
                  alt={`Превью ${previewModel.title}`}
                  fill
                  className="object-cover"
                  priority
                />
                
                {/* Навигация */}
                {/* <button 
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full"
                >
                  &lt;
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full"
                >
                  &gt;
                </button> */}
                
                {/* Индикаторы */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1">
                  {previewModel.images.map((_, index) => (
                    <div 
                      key={index}
                      className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
                
                {/* Подпись */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-white text-sm font-medium truncate">
                    {previewModel.title} ({currentImageIndex + 1}/{previewModel.images.length})
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}