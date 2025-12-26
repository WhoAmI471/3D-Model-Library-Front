'use client'
import ModelEditForm from '@/components/ModelEditForm'
import { use, useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient'

export default function UpdatePage({ params }) {
  const { id } = use(params)
  const [userRole, setUserRole] = useState(null)
  
  
  useEffect(() => {
    const load = async () => {
      try {
        const userData = await apiClient.auth.me()
        setUserRole(userData.user.role)
      } catch (err) {
        // router.push('/login')
      }
    }
    
    load()
  }, [])
  
  return (
    <div className="w-full mx-auto">
      {/* <h1 className="text-2xl font-bold mb-4">Редактирование модели</h1> */}
      <ModelEditForm id={ id } userRole={userRole}/>
    </div>
  )
}