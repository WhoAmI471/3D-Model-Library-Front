// /app/api/auth/me/route.js
import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'

export async function GET(request) {
  const user = await getUserFromSession()
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  return NextResponse.json({ user })
}
