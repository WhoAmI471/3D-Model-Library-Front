import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import prisma from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

export async function createSession(user) {
  const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, {
    expiresIn: '7d',
  })

  const cookie = await cookies()
  cookie.set('session', token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 дней
  })
}

export async function getUserFromSession() {
  const cookie = await cookies()
  const token = cookie.get('session')?.value

  if (!token) return null

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.id } })
    return user
  } catch (err) {
    return null
  }
}

export async function clearSession() {
  const cookie = await cookies()
  cookie.delete('session')
}
