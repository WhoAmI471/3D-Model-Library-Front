import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import prisma from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-please-change'

export async function createSession(user) {
  const token = jwt.sign(
    { 
      id: user.id, 
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions, // Исправлена опечатка (было prmissions)
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    }, 
    JWT_SECRET
  )

  await cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax'
  })
}

export async function getUserFromSession() {
  try {
    const cookieStore = await cookies()
    const token = await cookieStore.get('session')?.value
    return await verifyToken(token)
  } catch (error) {
    console.error('Error getting user from session:', error)
    return null
  }
}

async function verifyToken(token) {
  if (!token) return null

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    
    // Проверка срока действия токена
    if (payload.exp < Date.now() / 1000) {
      await clearSession()
      return null
    }

    const user = await prisma.user.findUnique({ 
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true
      }
    })

    if (!user) {
      await clearSession()
      return null
    }

    return user
  } catch (err) {
    await clearSession()
    return null
  }
}

export async function clearSession() {
  await cookies().set('session', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0)
  })
}