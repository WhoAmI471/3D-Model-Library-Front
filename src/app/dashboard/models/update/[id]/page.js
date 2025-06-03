'use client'
import ModelEditForm from '@/components/ModelEditForm'
import { use, useState, useEffect } from 'react';
import axios from 'axios'

export default function UpdatePage({ params }) {
  const { id } = use(params)
  const [userRole, setUserRole] = useState(null)
  
  
  useEffect(() => {
    const load = async () => {
      try {
        const userRes = await axios.get('/api/auth/me')
        setUserRole(userRes.data.user.role)
      } catch (err) {
        router.push('/login')
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