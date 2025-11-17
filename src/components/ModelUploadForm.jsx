'use client'
import { useState, useEffect, useRef } from 'react'
import { formatFileSize } from '@/lib/utils'

export default function ModelUploadForm() {
  const zipFileInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProjects, setSelectedProjects] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    projectId: '',
    authorId: '',
    version: '1.0',
    sphere: '',
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, projectsRes, currentUserRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/projects'),
          fetch('/api/auth/me')
        ])
        
        const usersData = await usersRes.json()
        const projectsData = await projectsRes.json()
        const currentUserData = await currentUserRes.json()
        
        const usersList = Array.isArray(usersData) ? usersData : []
        const user = currentUserData?.user || null
        
        setUsers(usersList)
        setProjects(Array.isArray(projectsData) ? projectsData : [])
        setCurrentUser(user)
        
        // Устанавливаем текущего пользователя по умолчанию, если автор еще не выбран
        if (user) {
          setFormState(prev => {
            // Устанавливаем только если автор еще не выбран
            if (!prev.authorId) {
              return {
                ...prev,
                authorId: user.id
              }
            }
            return prev
          })
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
        setUsers([])
        setProjects([])
        setCurrentUser(null)
      }
    }
    
    fetchData()
  }, [])

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

  const handleScreenshotAdd = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      setFormState(prev => ({
        ...prev,
        screenshots: [...prev.screenshots, ...files.map(file => ({
          file,
          preview: URL.createObjectURL(file)
        }))]
      }))
    }
  }

  const removeScreenshot = (index) => {
    setFormState(prev => {
      const newScreenshots = [...prev.screenshots]
      URL.revokeObjectURL(newScreenshots[index].preview)
      newScreenshots.splice(index, 1)
      return { ...prev, screenshots: newScreenshots }
    })
  }

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
    if (!formState.title || !formState.sphere || !formState.zipFile || formState.screenshots.length < 2) {
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
    formData.append('sphere', formState.sphere);
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
            // Небольшая задержка перед показом сообщения об успехе
            setTimeout(() => {
              alert('Модель загружена успешно!');
              // Сброс формы
              setFormState({
                title: '',
                description: '',
                projectId: '',
                authorId: currentUser ? currentUser.id : 'UNKNOWN',
                version: '1.0',
                sphere: '',
                zipFile: null,
                screenshots: []
              });
              setSelectedProjects([]);
              setUploadProgress(0);
              setUploadComplete(false);
              // Очищаем input файла
              if (zipFileInputRef.current) {
                zipFileInputRef.current.value = ''
              }
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


  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()))

  return (
    <div className="w-full mx-auto">
      <h1 className="text-2xl font-bold mb-6">Добавление новой модели</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Название модели */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название модели <span className="text-red-500">*</span>
            </label>
          <input
            name="title"
            placeholder="Введите название модели"
            value={formState.title}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            maxLength={50}
            required
          />
        </div>

        {/* Версия */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Версия <span className="text-red-500">*</span>
          </label>
          <input
            name="version"
            value={formState.version}
            onChange={handleChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
            maxLength={20}
          />
        </div>

          {/* Скриншоты */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Скриншоты <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">(минимум 2)</span>
            </label>
            
            {/* Добавление новых скриншотов */}
            <div className="mt-2">
              <label className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Добавить скриншоты
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleScreenshotAdd}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Галерея добавленных скриншотов */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {formState.screenshots.map((screenshot, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-md overflow-hidden">
                    <img
                      src={screenshot.preview}
                      alt={`Скриншот ${index + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 truncate">
                    {screenshot.file.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {formatFileSize(screenshot.file.size)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeScreenshot(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ZIP-архив модели */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP-архив модели <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex items-center gap-4">
              <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                {formState.zipFile ? 'Выбрать другой файл' : 'Выберите файл'}
                <input
                  ref={zipFileInputRef}
                  name="zipFile"
                  type="file"
                  onChange={handleZipFileChange}
                  accept=".zip"
                  className="sr-only"
                  required
                />
              </label>
              {formState.zipFile && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md group">
                  <div className="text-sm text-gray-700">
                    <p className="font-medium">{formState.zipFile.name}</p>
                    <p className="text-gray-500">{formatFileSize(formState.zipFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeZipFile}
                    className="ml-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    title="Удалить файл"
                  >
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Описание */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              name="description"
              placeholder="Добавьте описание модели"
              value={formState.description}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={4}
              maxLength={1000}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Автор */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Автор
            </label>
            <select
              name="authorId"
              value={formState.authorId || (currentUser ? currentUser.id : 'UNKNOWN')}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              {/* Текущий пользователь (Я) - по умолчанию */}
              {currentUser && (
                <option value={currentUser.id}>
                  {currentUser.name} (Я)
                </option>
              )}
              {/* Неизвестно */}
              <option value="UNKNOWN">Неизвестно</option>
              {/* Сторонняя модель */}
              <option value="EXTERNAL">Сторонняя модель</option>
            </select>
          </div>

          {/* Сфера */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сфера <span className="text-red-500">*</span>
            </label>
            <select
              name="sphere"
              value={formState.sphere}
              onChange={handleChange}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Выберите сферу</option>
              <option value="CONSTRUCTION">Строительство</option>
              <option value="CHEMISTRY">Химия</option>
              <option value="INDUSTRIAL">Промышленность</option>
              <option value="MEDICAL">Медицина</option>
              <option value="OTHER">Другое</option>
            </select>
          </div>

          <div className='w-full'>
            <h3 className="block text-sm font-medium text-gray-700 mb-1">Поиск проектов</h3>
            <div className="mt-2 relative">
              <input
                type="text"
                placeholder="Поиск проектов..."
                className=" w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={projectSearchTerm}
                onChange={(e) => setProjectSearchTerm(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>

          {/* Проекты */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Проекты
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto p-3 border border-gray-300 rounded-md">
              {filteredProjects.map(project => (
                <div key={project.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`project-${project.id}`}
                    checked={selectedProjects.includes(project.id)}
                    onChange={() => toggleProject(project.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor={`project-${project.id}`} className="ml-2 text-sm text-gray-700">
                    {project.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* Индикатор прогресса загрузки */}
        {(loading || uploadProgress > 0) && (
          <div className="pt-4">
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

        {/* Кнопка отправки */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Загрузка...
              </>
            ) : 'Загрузить модель'}
          </button>
          <p className="mt-2 text-xs text-gray-500 text-center">
            {uploadComplete 
              ? 'Модель загружена успешно!'
              : 'Заполните все обязательные поля (отмечены *) и нажмите "Загрузить модель"'}
          </p>
        </div>
      </form>
    </div>
  )
}
