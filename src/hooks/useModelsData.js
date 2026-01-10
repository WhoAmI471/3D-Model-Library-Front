'use client'
import { useState, useEffect } from 'react'
import apiClient from '@/lib/apiClient'
import { handleError } from '@/lib/errorHandler'

/**
 * Хук для загрузки моделей, сфер и текущего пользователя
 * Используется во многих компонентах для получения общих данных
 * 
 * @param {Object} options - Опции загрузки
 * @param {boolean} options.includeUsers - Загружать ли пользователей (по умолчанию false)
 * @param {boolean} options.includeProjects - Загружать ли проекты (по умолчанию false)
 * @returns {Object} Объект с данными и состоянием загрузки
 */
export function useModelsData(options = {}) {
  const { includeUsers = false, includeProjects = false } = options
  
  const [models, setModels] = useState([])
  const [spheres, setSpheres] = useState([])
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const promises = [
          apiClient.models.getAll(),
          apiClient.spheres.getAll(),
          apiClient.auth.me()
        ]

        if (includeUsers) {
          promises.push(apiClient.users.getAll())
        }

        if (includeProjects) {
          promises.push(apiClient.projects.getAll())
        }

        const results = await Promise.all(promises)
        
        const [modelsData, spheresData, currentUserData, ...additionalData] = results
        
        setModels(Array.isArray(modelsData) ? modelsData : [])
        setSpheres(Array.isArray(spheresData) ? spheresData : [])
        setCurrentUser(currentUserData?.user || null)

        if (includeUsers) {
          const usersData = additionalData.shift()
          setUsers(Array.isArray(usersData) ? usersData : [])
        }

        if (includeProjects) {
          const projectsData = additionalData.shift()
          setProjects(Array.isArray(projectsData) ? projectsData : [])
        }
      } catch (err) {
        const formattedError = await handleError(err, { context: 'useModelsData.fetchData', includeUsers, includeProjects })
        setError(formattedError)
        // Устанавливаем значения по умолчанию при ошибке
        setModels([])
        setSpheres([])
        setCurrentUser(null)
        if (includeUsers) setUsers([])
        if (includeProjects) setProjects([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [includeUsers, includeProjects])

  return {
    models,
    spheres,
    users,
    projects,
    currentUser,
    isLoading,
    error,
    // Удобные методы для обновления данных
    refetch: () => {
      setIsLoading(true)
      const fetchData = async () => {
        try {
          const promises = [
            apiClient.models.getAll(),
            apiClient.spheres.getAll(),
            apiClient.auth.me()
          ]

          if (includeUsers) {
            promises.push(apiClient.users.getAll())
          }

          if (includeProjects) {
            promises.push(apiClient.projects.getAll())
          }

          const results = await Promise.all(promises)
          const [modelsData, spheresData, currentUserData, ...additionalData] = results
          
          setModels(Array.isArray(modelsData) ? modelsData : [])
          setSpheres(Array.isArray(spheresData) ? spheresData : [])
          setCurrentUser(currentUserData?.user || null)

          if (includeUsers) {
            const usersData = additionalData.shift()
            setUsers(Array.isArray(usersData) ? usersData : [])
          }

          if (includeProjects) {
            const projectsData = additionalData.shift()
            setProjects(Array.isArray(projectsData) ? projectsData : [])
          }
        } catch (err) {
          const formattedError = await handleError(err, { context: 'useModelsData.refetch', includeUsers, includeProjects })
          setError(formattedError)
        } finally {
          setIsLoading(false)
        }
      }
      fetchData()
    }
  }
}

