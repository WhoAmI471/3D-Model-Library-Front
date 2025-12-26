'use client'
import { useState, useEffect } from 'react'

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
          fetch('/api/models').then(res => res.json()),
          fetch('/api/spheres').then(res => res.json()),
          fetch('/api/auth/me').then(res => res.json())
        ]

        if (includeUsers) {
          promises.push(fetch('/api/users').then(res => res.json()))
        }

        if (includeProjects) {
          promises.push(fetch('/api/projects').then(res => res.json()))
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
        console.error('Ошибка загрузки данных:', err)
        setError(err)
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
            fetch('/api/models').then(res => res.json()),
            fetch('/api/spheres').then(res => res.json()),
            fetch('/api/auth/me').then(res => res.json())
          ]

          if (includeUsers) {
            promises.push(fetch('/api/users').then(res => res.json()))
          }

          if (includeProjects) {
            promises.push(fetch('/api/projects').then(res => res.json()))
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
          console.error('Ошибка обновления данных:', err)
          setError(err)
        } finally {
          setIsLoading(false)
        }
      }
      fetchData()
    }
  }
}

