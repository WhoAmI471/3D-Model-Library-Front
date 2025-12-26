'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useModelsData } from '@/hooks/useModelsData'
import { useDragAndDrop } from '@/hooks/useDragAndDrop'
import ScreenshotsUploadSection from '@/components/modelForm/ScreenshotsUploadSection'
import ModelInfoSection from '@/components/modelForm/ModelInfoSection'
import ProjectsSection from '@/components/modelForm/ProjectsSection'
import FileUploadSection from '@/components/modelForm/FileUploadSection'

export default function ModelUploadForm({ initialProjectId = null }) {
  const router = useRouter()
  const zipFileInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadComplete, setUploadComplete] = useState(false)
  const { users, projects, spheres, models: allModels, currentUser } = useModelsData({ includeUsers: true, includeProjects: true })
  const [selectedProjects, setSelectedProjects] = useState([])
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    projectId: '',
    authorId: '',
    version: '1.0',
    sphereId: '',
    zipFile: null,
    screenshots: []
  })
  const [projectSearchTerm, setProjectSearchTerm] = useState('')

  const toggleProject = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  // Устанавливаем текущего пользователя по умолчанию, если автор еще не выбран
  useEffect(() => {
    if (currentUser && !formState.authorId) {
      setFormState(prev => ({
        ...prev,
        authorId: currentUser.id
      }))
    }
  }, [currentUser, formState.authorId])
  
  // Автоматически выбираем проект, если передан initialProjectId
  useEffect(() => {
    if (initialProjectId && projects.length > 0) {
      setSelectedProjects([initialProjectId])
    }
  }, [initialProjectId, projects])

  // Получаем информацию о выбранном проекте для отображения города
  const selectedProject = projects.find(p => selectedProjects.includes(p.id))
  
  // Функция для фильтрации символов - разрешает только латиницу, кириллицу, цифры, пробелы и основные знаки препинания
  const filterAllowedCharacters = (text) => {
    // Регулярное выражение: латиница, кириллица, цифры, пробелы, точка, запятая, дефис, подчеркивание, скобки, двоеточие, точка с запятой
    const allowedPattern = /[a-zA-Zа-яА-ЯёЁ0-9\s.,\-_():;]/g
    const matches = text.match(allowedPattern)
    return matches ? matches.join('') : ''
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Применяем фильтрацию только для полей "title" и "description"
    if (name === 'title' || name === 'description') {
      const filteredValue = filterAllowedCharacters(value)
      setFormState(prev => ({ ...prev, [name]: filteredValue }))
    } else {
      setFormState(prev => ({ ...prev, [name]: value }))
    }
  }

  // Обработчик для предотвращения ввода недопустимых символов с клавиатуры
  const handleKeyDown = (e) => {
    const { name } = e.target
    if (name === 'title' || name === 'description') {
      // Разрешаем служебные клавиши (Backspace, Delete, стрелки, Tab, Enter и т.д.)
      const allowedKeys = [
        'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End', 'Tab', 'Enter', 'Escape'
      ]
      
      // Разрешаем комбинации с Ctrl/Cmd (копирование, вставка и т.д.)
      if (e.ctrlKey || e.metaKey || allowedKeys.includes(e.key)) {
        return
      }
      
      // Проверяем вводимый символ
      const char = e.key
      if (char && char.length === 1 && !/[a-zA-Zа-яА-ЯёЁ0-9\s.,\-_():;]/.test(char)) {
        e.preventDefault()
      }
    }
  }

  // Обработчик для предотвращения вставки недопустимых символов
  const handlePaste = (e) => {
    const { name, selectionStart, selectionEnd, value } = e.target
    if (name === 'title' || name === 'description') {
      e.preventDefault()
      const pastedText = (e.clipboardData || window.clipboardData).getData('text')
      const filteredText = filterAllowedCharacters(pastedText)
      // Вставляем отфильтрованный текст в позицию курсора
      const newValue = value.substring(0, selectionStart) + filteredText + value.substring(selectionEnd)
      setFormState(prev => ({ ...prev, [name]: newValue }))
      // Восстанавливаем позицию курсора после обновления состояния
      setTimeout(() => {
        const input = e.target
        const newCursorPos = selectionStart + filteredText.length
        input.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    }
  }

  const handleZipFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Проверка расширения файла
      const fileName = file.name.toLowerCase()
      const isZip = fileName.endsWith('.zip')
      
      if (!isZip) {
        alert('Можно загружать только .zip файлы!')
        // Очищаем input
        if (zipFileInputRef.current) {
          zipFileInputRef.current.value = ''
        }
        setFormState(prev => ({ ...prev, zipFile: null }))
        return
      }
      
      setFormState(prev => ({ ...prev, zipFile: file }))
    }
  }

  const isValidImageFile = (file) => {
    // Проверка MIME типа
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
    if (!validMimeTypes.includes(file.type.toLowerCase())) {
      return false
    }
    
    // Проверка расширения файла
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
    
    return hasValidExtension
  }

  const handleScreenshotAdd = (newScreenshots) => {
    setFormState(prev => ({
      ...prev,
      screenshots: [...prev.screenshots, ...newScreenshots]
    }))
  }

  const removeScreenshot = (index) => {
    setFormState(prev => {
      const newScreenshots = [...prev.screenshots]
      URL.revokeObjectURL(newScreenshots[index].preview)
      newScreenshots.splice(index, 1)
      return { ...prev, screenshots: newScreenshots }
    })
  }

  // Drag and drop для скриншотов
  const handleScreenshotsReorder = (newScreenshots) => {
    setFormState(prev => ({
      ...prev,
      screenshots: newScreenshots
    }))
  }

  const {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragAndDrop(formState.screenshots, handleScreenshotsReorder)

  const removeZipFile = () => {
    setFormState(prev => ({ ...prev, zipFile: null }))
    // Очищаем input
    if (zipFileInputRef.current) {
      zipFileInputRef.current.value = ''
    }
  }


  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Проверка обязательных полей
    if (!formState.title || !formState.sphereId || !formState.zipFile || formState.screenshots.length < 2) {
      alert('Пожалуйста, заполните все обязательные поля и добавьте минимум 2 скриншота');
      return;
    }

    // Если загрузка уже идет, не отправляем повторно
    if (loading) {
      return;
    }
  
    setLoading(true);
    setUploadProgress(0);
    setUploadComplete(false);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    
    formData.append('title', formState.title);
    formData.append('description', formState.description);
    formData.append('authorId', formState.authorId);
    formData.append('sphereId', formState.sphereId);
    formData.append('version', formState.version);

    selectedProjects.forEach(id => formData.append('projectIds', id));

    formData.append('zipFile', formState.zipFile);
    formState.screenshots.forEach(sc => formData.append('screenshots', sc.file));

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result.success) {
            setUploadProgress(100);
            setUploadComplete(true);
            // Небольшая задержка перед возвратом на предыдущую страницу
            setTimeout(() => {
              router.back();
            }, 500);
          } else {
            throw new Error(result.error || 'Ошибка при сохранении модели');
          }
        } catch (err) {
          console.error('Ошибка парсинга ответа:', err);
          alert('Ошибка при сохранении модели');
          setUploadProgress(0);
          setUploadComplete(false);
        }
      } else {
        setUploadProgress(0);
        setUploadComplete(false);
        try {
          const error = JSON.parse(xhr.responseText);
          alert(error.error || 'Ошибка загрузки файлов. Попробуйте снова.');
        } catch {
          alert('Ошибка загрузки файлов. Попробуйте снова.');
        }
      }
      setLoading(false);
    });

    xhr.addEventListener('error', () => {
      setUploadProgress(0);
      setUploadComplete(false);
      setLoading(false);
      alert('Ошибка загрузки файлов. Проверьте подключение к интернету.');
    });

    xhr.addEventListener('abort', () => {
      setUploadProgress(0);
      setUploadComplete(false);
      setLoading(false);
    });

    xhr.open('POST', '/api/models/upload');
    xhr.send(formData);
  };


  // Сортировка сфер: по количеству моделей, "Другое" в конце
  const sortedSpheres = [...spheres].sort((a, b) => {
    const aCount = allModels.filter(model => model.sphere?.id === a.id).length
    const bCount = allModels.filter(model => model.sphere?.id === b.id).length
    
    // Если одна из сфер называется "Другое", она идет в конец
    if (a.name === 'Другое') return 1
    if (b.name === 'Другое') return -1
    
    // Остальные сортируем по количеству моделей (от большего к меньшему)
    return bCount - aCount
  })

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()))

  return (
    <div className="min-h-full bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Заголовок с редактируемым названием */}
        <div className="mb-6 pb-8 border-b border-gray-200 relative flex items-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute -left-12 bottom-8 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Назад"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <input
            name="title"
            value={formState.title}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="text-2xl font-semibold text-gray-900 leading-none pb-0 w-full bg-transparent border-none focus:outline-none focus:ring-0 p-0"
            placeholder="Название модели"
            required
            maxLength={50}
          />
        </div>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Галерея скриншотов */}
        <ScreenshotsUploadSection
          screenshots={formState.screenshots}
          onAdd={handleScreenshotAdd}
          onRemove={removeScreenshot}
          draggedIndex={draggedIndex}
          dragOverIndex={dragOverIndex}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={loading}
        />

        {/* Информация о модели */}
        <ModelInfoSection
          form={formState}
          handleChange={handleChange}
          users={users}
          currentUser={currentUser}
          sortedSpheres={sortedSpheres}
          canEditModel={true}
          canEditDescription={true}
          canEditSphere={true}
          showTitle={false}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        
        {/* Проект (если выбран) */}
        {selectedProject && (
          <div className="mb-8">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Проект</div>
              <div className="text-sm font-medium text-gray-900">
                {selectedProject.name}
                {selectedProject.city && (
                  <span className="text-gray-500 ml-2">• {selectedProject.city}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Проекты */}
        <ProjectsSection
          projects={projects}
          selectedProjects={selectedProjects}
          onToggleProject={toggleProject}
          searchTerm={projectSearchTerm}
          onSearchChange={setProjectSearchTerm}
          disabled={loading}
        />

        {/* ZIP-архив модели */}
        <FileUploadSection
          newFile={formState.zipFile}
          onFileChange={(file) => setFormState(prev => ({ ...prev, zipFile: file }))}
          disabled={loading}
          label="ZIP-архив модели *"
        />

        {/* Кнопки действий */}
        <div className="sticky bottom-6 mt-8 flex flex-col items-end gap-4 z-10">
          {/* Индикатор прогресса загрузки */}
          {(loading || uploadProgress > 0) && (
            <div className="w-full max-w-md mt-2">
              <div className="mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {uploadComplete ? 'Готово' : `Загрузка: ${uploadProgress}%`}
                  </span>
                  {uploadComplete && (
                    <span className="text-sm text-green-600 font-semibold">✓</span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      uploadComplete ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Загрузка...
                  </>
                ) : 'Загрузить модель'}
              </button>
            </div>
          </div>
        </div>
      </form>
      </div>
    </div>
  )
}
