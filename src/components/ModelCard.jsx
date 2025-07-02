'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'
import { formatDateTime, proxyUrl } from '@/lib/utils'
import { checkAnyPermission, checkPermission } from '@/lib/permission'
// import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios'
import Image from 'next/image';

import Download from "../../public/Download.svg"
import Delete from "../../public/Delete.svg"
import Edit from "../../public/Edit.svg"

const SPHERE_TRANSLATIONS = {
  CONSTRUCTION: 'Строительство',
  CHEMISTRY: 'Химия',
  INDUSTRIAL: 'Промышленность',
  MEDICAL: 'Медицина',
  OTHER: 'Другое',
  // Добавьте другие значения по необходимости
};

export const ModelCard = ({ model, onDeleteRequest, projectId }) => {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState();
  const [selectedVersion, setSelectedVersion] = useState(
    model.versions && model.versions.length > 0
      ? model.versions[model.versions.length - 1]
      : { fileUrl: model.fileUrl, images: model.images, version: 'Последняя' }
  );
  
  useEffect(() => {
    const load = async () =>
    {
      const userRes = await axios.get('/api/auth/me')
      setUser(userRes.data.user)
      console.log(userRes.data.user)
      setUser(userRes.data.user)
    }
    load()
  }, [])

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(proxyUrl(selectedVersion.fileUrl));
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

  const openModal = (index) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === selectedVersion.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? selectedVersion.images.length - 1 : prev - 1
    );
  };

  const handleDeleteRequest = async () => {
    if (user?.role === 'ADMIN') {
      if (confirm('Вы уверены, что хотите удалить эту модель?')) {
        const result = await onDeleteRequest(model.id, true);
        if (result?.success && result.redirect) {
          router.push('/dashboard');
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
            router.refresh();
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          alert(error.message);
        }
      }
    }
  };


  return (
    <div className="w-full mx-auto rounded-lg overflow-hidden">
      {/* Умные хлебные крошки */}
      <div className="px-6 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
        {projectId ? (
          <>
            <Link href="/dashboard/projects" className="hover:text-blue-600">Проекты</Link> / 
            <Link href={`/dashboard/projects/${projectId}`} className="hover:text-blue-600"> 
              {model.projects?.find(p => p.id === projectId)?.name || 'Проект'}
            </Link> / 
            <span className="font-medium"> {model.title}</span>
          </>
        ) : (
          <>
            <Link href="/dashboard" className="hover:text-blue-600">Модели</Link> / 
            <span className="font-medium"> {model.title}</span>
          </>
        )}
      </div>

      {/* Основное содержимое */}
      <div className="p-6 text-gray-800">
        <h1 className="text-2xl pb-4 font-bold text-gray-800">{model.title}</h1>
        {/* Галерея изображений */}
        {selectedVersion.images?.length > 0 && (
          <div className="mb-6">
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {selectedVersion.images.map((image, index) => (
                <div
                  key={index}
                  className="relative flex-shrink-0 w-64 h-48 cursor-pointer"
                  onClick={() => openModal(index)}
                >
                  <Image
                    src={proxyUrl(image)}
                    alt={`${model.title} - изображение ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {isModalOpen && (
          <div className="fixed inset-0 bg-opacity-90 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full bg-white rounded-lg shadow-md">
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 text-blue-600 z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className="relative h-[70vh] w-full">
                <Image
                  src={proxyUrl(selectedVersion.images[currentImageIndex])}
                  alt={`${model.title} - изображение ${currentImageIndex + 1}`}
                  fill
                  className="object-contain"
                />
              </div>
              
              <div className="flex justify-between items-center pb-6 ml-10 mr-10">
                <div className="flex space-x-2">
                  {selectedVersion.images.map((_, index) => (
                    <div 
                      key={index}
                      className={`h-2 w-2 rounded-full ${index === currentImageIndex ? 'bg-blue-600' : 'bg-blue-300'}`}
                    />
                  ))}
                </div>

                <div>
                  <button 
                    onClick={prevImage}
                    className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full pr-5"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M10.9393 23.5607C11.5251 24.1464 12.4749 24.1464 13.0607 23.5607C13.6464 22.9749 13.6464 22.0251 13.0607 21.4393L5.1213 13.5L22.5 13.5C23.3284 13.5 24 12.8284 24 12C24 11.1716 23.3284 10.5 22.5 10.5L5.1213 10.5L13.0607 2.56065C13.6464 1.9749 13.6464 1.0251 13.0607 0.439347C12.4749 -0.146403 11.5251 -0.146403 10.9393 0.439347L0.4404 10.9383C0.436801 10.9419 0.4332 10.9455 0.429601 10.9492C0.164851 11.2188 0.00120081 11.5881 1.04947e-06 11.9955C1.04934e-06 11.997 1.0492e-06 11.9985 1.04907e-06 12C1.04894e-06 12.0015 1.04881e-06 12.003 1.04868e-06 12.0045C0.000601846 12.2062 0.0409518 12.3986 0.113851 12.5742C0.185401 12.7471 0.290551 12.9093 0.429601 13.0508C0.4332 13.0544 0.43665 13.058 0.440251 13.0616" fill="#2763FE"/>
                    </svg>
                  </button>
                  
                  <button 
                    onClick={nextImage}
                    className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full pl-5"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clip-rule="evenodd" d="M13.0607 0.43934C12.4749 -0.146447 11.5251 -0.146447 10.9393 0.43934C10.3536 1.02513 10.3536 1.97487 10.9393 2.56067L18.8787 10.5H1.5C0.671572 10.5 0 11.1716 0 12C0 12.8284 0.671572 13.5 1.5 13.5H18.8787L10.9393 21.4393C10.3536 22.0251 10.3536 22.9749 10.9393 23.5606C11.5251 24.1464 12.4749 24.1464 13.0607 23.5606L23.5596 13.0617C23.5632 13.0581 23.5668 13.0545 23.5704 13.0508C23.8351 12.7812 23.9988 12.4119 24 12.0045C24 12.003 24 12.0015 24 12C24 11.9985 24 11.997 24 11.9955C23.9994 11.7937 23.959 11.6014 23.8862 11.4258C23.8146 11.2529 23.7094 11.0907 23.5704 10.9492C23.5668 10.9456 23.5634 10.942 23.5597 10.9384" fill="#2763FE"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Информация о модели */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start">
            <span className="w-34 text-gray-600">Автор:</span>
            <span className="font-medium">{model.author?.name || 'Не указан'}</span>
          </div>
          
          <div className="flex items-start">
            <span className="w-34 text-gray-600">Описание:</span>
            <p className="whitespace-pre-line">{model.description}</p>
          </div>
          
          <div className="flex items-start">
            <span className="w-34 text-gray-600">Дата изменения:</span>
            <span>{formatDateTime(model.updatedAt)}</span>
          </div>
          
          <div className="flex items-start">
            <span className="w-34 text-gray-600">Проекты:</span>
            <div className="flex flex-wrap gap-1">
              {model.projects?.length > 0 ? (
                model.projects.map(project => (
                  <Link 
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                  >
                    {project.name}
                  </Link>
                ))
              ) : (
                <span>—</span>
              )}
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="w-34 text-gray-600">Сфера:</span>
            <span>{model.sphere ? SPHERE_TRANSLATIONS[model.sphere] || model.sphere : 'Другое'}</span>
          </div>
        </div>

        {/* кнопки */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex space-x-2">

            {model.versions?.length > 0 && (
              <select
                value={selectedVersion.version}
                onChange={(e) => {
                  const ver = model.versions.find(v => v.version === e.target.value);
                  if (ver) {
                    setSelectedVersion(ver);
                    setCurrentImageIndex(0);
                  }
                }}
                className="px-2 py-1 border rounded text-sm"
              >
                {model.versions.map(v => (
                  <option key={v.id} value={v.version}>{v.version}</option>
                ))}
              </select>
            )}
            
            {checkPermission(user, 'download_models') && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-3 py-1 bg-blue-100 flex hover:bg-blue-200 text-blue-600 text-sm rounded"
              >
                <Image
                  src={Download} 
                  alt="Edit" 
                  width={18} 
                  height={18}
                  className='mr-2'
                />
                {isDownloading ? 'Скачивание...' : 'Скачать'}
              </button>)
            }
            
            {checkAnyPermission(user, 'edit_models', 'edit_model_description') && (
              <Link 
                href={`/dashboard/models/update/${model.id}`}
                className="px-3 py-1 bg-blue-100 flex hover:bg-blue-200 text-blue-600 text-sm rounded"
              >
                <Image
                  src={Edit} 
                  alt="Edit" 
                  width={18} 
                  height={18}
                  className='mr-2'
                />
                Изменить
              </Link>)
            }
            
            {checkPermission(user, 'delete_models') && (
              <button 
                onClick={handleDeleteRequest}
                className="px-3 py-1 bg-blue-100 flex hover:bg-blue-200 text-blue-600 text-sm rounded"
              >
                <Image
                  src={Delete} 
                  alt="Edit" 
                  width={18} 
                  height={18}
                  className='mr-2'
                />
                Удалить
              </button>)
            }
          </div>
        </div>

        {/* История изменений */}
        <div className="border-t border-gray-200 pt-4">
          {/* <h3 className="text-lg font-semibold mb-3">История изменений</h3> */}
          <div className="space-y-2">
            {model.logs?.map((log, index) => (
              <div key={index} className="text-sm">
                <span className="text-gray-500">{formatDateTime(log.createdAt)} </span>
                <span className="font-medium">{log.user?.name || 'Система'} </span>
                <span>{log.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
