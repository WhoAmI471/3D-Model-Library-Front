import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth'

export async function middleware(request) {
  const user = await getUserFromSession()
  const { pathname } = request.nextUrl

  // Защищённые пути
  const protectedPaths = ['/dashboard', '/dashboard/models']

  if (protectedPaths.some(path => pathname.startsWith(path)) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}