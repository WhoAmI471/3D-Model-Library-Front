'use client'
import ModelEditForm from '@/components/ModelEditForm'
import { use } from 'react';

export default function UpdatePage({ params }) {
  const { id } = use(params)
  // console.log(params.id);
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Редактирование модели</h1>
      <ModelEditForm id={ id } />
    </div>
  )
}