import { NextResponse } from 'next/server'
import axios from 'axios'
import { prisma } from '@/lib/prisma'
import { sanitizeName } from '@/lib/nextcloud'
import { getUserFromSession } from '@/lib/auth'

function getConfig() {
  const url = process.env.NEXTCLOUD_URL
  const username = process.env.NEXTCLOUD_ADMIN_USER
  const password = process.env.NEXTCLOUD_ADMIN_PASSWORD
  if (url && username && password) {
    return { url, username, password }
  }
  return null
}

async function listImages(folder) {
  const cfg = getConfig()
  if (!cfg) return []
  const { url, username, password } = cfg
  const target = `${url}/remote.php/dav/files/${username}/${folder}`
  const xml = `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontenttype/></d:prop></d:propfind>`
  try {
    const res = await axios.request({
      method: 'PROPFIND',
      url: target,
      auth: { username, password },
      headers: { Depth: '1', 'Content-Type': 'application/xml' },
      data: xml
    })
    const matches = [...res.data.matchAll(/<d:href>([^<]+)<\/d:href>[\s\S]*?<d:getcontenttype>([^<]+)<\/d:getcontenttype>/g)]
    return matches
      .filter(([, , type]) => type.startsWith('image/'))
      .map(([href]) => decodeURIComponent(href))
      .filter(path => !path.endsWith('/'))
      .map(path => `${url}${path}`)
  } catch (err) {
    if (err.response?.status === 404) return []
    console.error('Failed to list images from Nextcloud', err)
    return []
  }
}

export async function GET(request, { params }) {
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  const { id } = params
  const { searchParams } = new URL(request.url)
  const version = searchParams.get('version') || 'current'
  const model = await prisma.model.findUnique({ where: { id: String(id) } })
  if (!model) {
    return NextResponse.json({ error: 'Модель не найдена' }, { status: 404 })
  }
  const folder = `models/${sanitizeName(model.title)}/v${version}/screenshots`
  const files = await listImages(folder)
  return NextResponse.json({ files })
}
