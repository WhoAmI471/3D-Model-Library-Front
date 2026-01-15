import { NextResponse } from 'next/server'
import axios from 'axios'

// Функция для валидации и санитизации пути
function sanitizePath(path, nextcloudUrl) {
  if (!path || typeof path !== 'string') {
    return null
  }
  
  let relativePath = path
  
  // Если путь начинается с полного URL Nextcloud, извлекаем относительный путь
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Проверяем, что это URL нашего Nextcloud, а не произвольный внешний URL
    if (!nextcloudUrl) {
      return null // Нет конфигурации Nextcloud
    }
    
    try {
      const pathUrl = new URL(path)
      const nextcloudUrlObj = new URL(nextcloudUrl)
      
      // Разрешаем только URL нашего Nextcloud
      if (pathUrl.origin !== nextcloudUrlObj.origin) {
        return null // Внешний URL - отклоняем
      }
      
      // Извлекаем относительный путь из URL
      // Формат: http://localhost:8080/remote.php/dav/files/admin/models/...
      // Нужно извлечь часть после /remote.php/dav/files/{username}/
      const davPathMatch = path.match(/\/remote\.php\/dav\/files\/[^\/]+\/(.+)$/i)
      if (davPathMatch && davPathMatch[1]) {
        relativePath = davPathMatch[1]
      } else {
        return null // Неверный формат URL
      }
    } catch (e) {
      return null // Некорректный URL
    }
  }
  
  // Проверяем на опасные паттерны в относительном пути
  const dangerousPatterns = [
    /[|&;`$(){}[\]]/,          // Команды оболочки
    /base64/i,                  // base64 декодирование
    /eval|exec|system|spawn/i, // Выполнение кода
    /\.\./,                     // Path traversal
    /[\x00-\x1f\x7f-\x9f]/,    // Контрольные символы
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(relativePath)) {
      return null
    }
  }
  
  // Убираем начальные и конечные слеши, нормализуем путь
  const normalized = relativePath.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
  
  // Проверяем, что путь не пустой и не слишком длинный
  if (!normalized || normalized.length > 1000) {
    return null
  }
  
  return normalized
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  
  const url = process.env.NEXTCLOUD_URL
  const username = process.env.NEXTCLOUD_ADMIN_USER
  const password = process.env.NEXTCLOUD_ADMIN_PASSWORD

  if (!url || !username || !password) {
    return NextResponse.json({ error: 'Nextcloud configuration missing' }, { status: 500 })
  }
  
  // Валидация пути (передаем nextcloudUrl для проверки, что это наш Nextcloud)
  const sanitizedPath = sanitizePath(path, url)
  if (!sanitizedPath) {
    return NextResponse.json({ error: 'Invalid or dangerous path' }, { status: 400 })
  }

  // Безопасное формирование URL - только для путей внутри Nextcloud
  // Разрешаем как относительные пути, так и полные URL нашего Nextcloud
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
