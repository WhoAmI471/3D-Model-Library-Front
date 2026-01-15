import { NextResponse } from 'next/server'
import axios from 'axios'

// Функция для валидации и санитизации пути
function sanitizePath(path) {
  if (!path || typeof path !== 'string') {
    return null
  }
  
  // Удаляем все опасные символы и конструкции
  // Запрещаем: http/https протоколы, команды оболочки, base64, и другие опасные паттерны
  const dangerousPatterns = [
    /^https?:\/\//i,           // HTTP/HTTPS протоколы
    /[|&;`$(){}[\]]/,          // Команды оболочки
    /base64/i,                  // base64 декодирование
    /eval|exec|system|spawn/i, // Выполнение кода
    /\.\./,                     // Path traversal
    /\/\//,                     // Двойные слеши
    /[\x00-\x1f\x7f-\x9f]/,    // Контрольные символы
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(path)) {
      return null
    }
  }
  
  // Убираем начальные и конечные слеши, нормализуем путь
  const normalized = path.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
  
  // Проверяем, что путь не пустой и не слишком длинный
  if (!normalized || normalized.length > 1000) {
    return null
  }
  
  return normalized
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  
  // Валидация пути
  const sanitizedPath = sanitizePath(path)
  if (!sanitizedPath) {
    return NextResponse.json({ error: 'Invalid or dangerous path' }, { status: 400 })
  }

  const url = process.env.NEXTCLOUD_URL
  const username = process.env.NEXTCLOUD_ADMIN_USER
  const password = process.env.NEXTCLOUD_ADMIN_PASSWORD

  if (!url || !username || !password) {
    return NextResponse.json({ error: 'Nextcloud configuration missing' }, { status: 500 })
  }

  // Безопасное формирование URL - только для путей внутри Nextcloud
  // Убрана возможность использовать произвольные HTTP URL
  const target = `${url}/remote.php/dav/files/${username}/${sanitizedPath}`

  try {
    const res = await axios.get(target, {
      responseType: 'arraybuffer',
      auth: { username, password },
      headers: { 'OCS-APIRequest': 'true' }
    })

    const contentType = res.headers['content-type'] || 'application/octet-stream'
    const disposition = res.headers['content-disposition']

    const response = new NextResponse(res.data, {
      headers: {
        'Content-Type': contentType,
        ...(disposition ? { 'Content-Disposition': disposition } : {})
      }
    })
    return response
  } catch (err) {
    const status = err.response?.status
    if (status === 404) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    console.error('Failed to fetch file from Nextcloud:', err)
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 })
  }
}
