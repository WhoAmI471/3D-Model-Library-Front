// app/page.js
import { redirect } from 'next/navigation'
import { getUserFromSession } from '@/lib/auth'  // Ваша функция из примера

export default async function Home() {
  const user = await getUserFromSession()
  if (user) redirect('/dashboard')
  else redirect('/login')
}