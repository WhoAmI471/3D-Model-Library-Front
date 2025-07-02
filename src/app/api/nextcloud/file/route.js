import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  if (!path) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 })
  }

  const url = process.env.NEXTCLOUD_URL
  const username = process.env.NEXTCLOUD_ADMIN_USER
  const password = process.env.NEXTCLOUD_ADMIN_PASSWORD

  if (!url || !username || !password) {
    return NextResponse.json({ error: 'Nextcloud configuration missing' }, { status: 500 })
  }

  const target = path.startsWith('http') ? path : `${url}/remote.php/dav/files/${username}/${path}`

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
