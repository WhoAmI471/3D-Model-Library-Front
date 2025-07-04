// /app/api/auth/logout/route.js
import { clearSession } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  await clearSession()
  return NextResponse.json({ message: 'Выход выполнен' })
}
