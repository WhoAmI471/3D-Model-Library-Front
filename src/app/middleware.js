import { NextResponse } from 'next/server'
import { getUserFromSession } from './lib/auth'

// Пути, доступные без авторизации
const PUBLIC_PATHS = ['/login', '/api/auth']

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Пропускаем публичные пути
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const user = await getUserFromSession(request)

  // Если пользователь не авторизован - редирект на логин
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}