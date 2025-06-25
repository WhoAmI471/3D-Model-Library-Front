import axios from 'axios'

function getConfig() {
  const url = process.env.NEXTCLOUD_URL
  const username = process.env.NEXTCLOUD_ADMIN_USER
  const password = process.env.NEXTCLOUD_ADMIN_PASSWORD
  if (url && username && password) {
    return { url, username, password }
  }
  return null
}

export function sanitizeName(name) {
  return name.replace(/[^a-z0-9_\-]+/gi, '_')
}

export async function createFolderRecursive(folder) {
  const cfg = getConfig()
  if (!cfg) return
  const { url, username, password } = cfg
  const parts = folder.split('/')
  let current = ''
  for (const part of parts) {
    current = current ? `${current}/${part}` : part
    const folderUrl = `${url}/remote.php/dav/files/${username}/${current}`
    try {
      await axios.request({
        method: 'MKCOL',
        url: folderUrl,
        auth: { username, password },
        headers: { 'OCS-APIRequest': 'true' }
      })
    } catch (err) {
      if (err.response?.status !== 405 && err.response?.status !== 409) throw err
    }
  }
}

async function renameFolder(oldPath, newPath) {
  const cfg = getConfig()
  if (!cfg) return
  const { url, username, password } = cfg
  const source = `${url}/remote.php/dav/files/${username}/${oldPath}`
  const destination = `${url}/remote.php/dav/files/${username}/${newPath}`
  await axios.request({
    method: 'MOVE',
    url: source,
    auth: { username, password },
    headers: { Destination: destination, Overwrite: 'T', 'OCS-APIRequest': 'true' }
  })
}

async function getFileId(path) {
  const cfg = getConfig()
  if (!cfg) return null
  const { url, username, password } = cfg
  const propfind = `<?xml version="1.0"?>\n<d:propfind xmlns:d=\"DAV:\" xmlns:oc=\"http://owncloud.org/ns\"><d:prop><oc:fileid/></d:prop></d:propfind>`
  const res = await axios({
    method: 'PROPFIND',
    url: `${url}/remote.php/dav/files/${username}/${path}`,
    auth: { username, password },
    data: propfind,
    headers: { Depth: '0', 'Content-Type': 'text/xml' }
  })
  const match = res.data.match(/<oc:fileid>(\d+)<\/oc:fileid>/)
  return match ? match[1] : null
}

async function ensureTag(tag) {
  const cfg = getConfig()
  if (!cfg) return null
  const { url, username, password } = cfg
  const list = await axios.get(`${url}/ocs/v2.php/apps/files/api/v1/systemtags`, {
    auth: { username, password },
    headers: { 'OCS-APIRequest': 'true' }
  })
  const existing = list.data?.ocs?.data?.find(t => t.name === tag)
  if (existing) return existing.id
  const create = await axios.post(`${url}/ocs/v2.php/apps/files/api/v1/systemtags`, `name=${encodeURIComponent(tag)}`, {
    auth: { username, password },
    headers: { 'OCS-APIRequest': 'true', 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  return create.data?.ocs?.data?.id
}

async function getCurrentTags(fileId) {
  const cfg = getConfig()
  if (!cfg) return []
  const { url, username, password } = cfg
  const res = await axios.get(`${url}/ocs/v2.php/apps/files/api/v1/systemtags-relations/files/${fileId}`, {
    auth: { username, password },
    headers: { 'OCS-APIRequest': 'true' }
  })
  return res.data?.ocs?.data?.map(t => t.name) || []
}

async function setTagsForPath(path, tags) {
  const cfg = getConfig()
  if (!cfg) return
  const { url, username, password } = cfg
  const fileId = await getFileId(path)
  if (!fileId) return
  const current = await getCurrentTags(fileId)
  const toAdd = tags.filter(t => !current.includes(t))
  const toRemove = current.filter(t => !tags.includes(t))
  for (const tag of toAdd) {
    const id = await ensureTag(tag)
    await axios.put(`${url}/ocs/v2.php/apps/files/api/v1/systemtags-relations/files/${fileId}/${id}`, null, {
      auth: { username, password },
      headers: { 'OCS-APIRequest': 'true' }
    })
  }
  for (const tag of toRemove) {
    const id = await ensureTag(tag)
    await axios.delete(`${url}/ocs/v2.php/apps/files/api/v1/systemtags-relations/files/${fileId}/${id}`, {
      auth: { username, password },
      headers: { 'OCS-APIRequest': 'true' }
    })
  }
}

export async function syncModelFolder(model, oldTitle = null) {
  const folder = `models/${sanitizeName(model.title)}`
  const prevFolder = oldTitle && sanitizeName(oldTitle) !== sanitizeName(model.title)
    ? `models/${sanitizeName(oldTitle)}`
    : null
  if (prevFolder) {
    await renameFolder(prevFolder, folder)
  } else {
    await createFolderRecursive(folder)
  }
  const tags = model.projects ? model.projects.map(p => p.name) : []
  await setTagsForPath(folder, tags)
  return folder
}

export default {
  syncModelFolder,
  sanitizeName,
  createFolderRecursive
}
