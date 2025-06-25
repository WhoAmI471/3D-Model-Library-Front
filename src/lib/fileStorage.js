// src/lib/fileStorage.js
import path from 'path'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { sanitizeName } from './nextcloud'
import { createFolderRecursive } from './nextcloud'


function getNextcloudConfig() {
  const url = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_ADMIN_USER;
  const password = process.env.NEXTCLOUD_ADMIN_PASSWORD;
  if (url && username && password) {
    return { url, username, password };
  }
  return null;
}

export function modelSubfolder(modelTitle, version, isScreenshot = false) {
  const folderName = sanitizeName(modelTitle)
  const parts = ['models', folderName, `v${version}`]
  if (isScreenshot) parts.push('screenshots')
  return parts.join('/')
}

export async function saveFile(file, subfolder = 'models') {
  const nextcloud = getNextcloudConfig();
  try {
    const fileExt = path.extname(file.name);
    const fileName = `${uuidv4()}${fileExt}`;

    if (!nextcloud) {
      throw new Error('Nextcloud configuration is missing');
    }

    const { url, username, password } = nextcloud;
    await createFolderRecursive(subfolder);
    const folderUrl = `${url}/remote.php/dav/files/${username}/${subfolder}`;

    const uploadUrl = `${folderUrl}/${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await axios.put(uploadUrl, buffer, {
      auth: { username, password },
      headers: {
        'OCS-APIRequest': 'true',
        'Content-Type': file.type || 'application/octet-stream'
      }
    });
    return uploadUrl;
  } catch (err) {
    console.error('File save error:', err);
    throw err;
  }
}

export async function saveModelFile(file, modelTitle, version, isScreenshot = false) {
  const folder = modelSubfolder(modelTitle, version, isScreenshot)
  return saveFile(file, folder)
}

export async function deleteFile(filePath) {
  const nextcloud = getNextcloudConfig()
  if (!nextcloud) {
    throw new Error('Nextcloud configuration is missing')
  }
  try {
    if (!filePath) return

    const { url, username, password } = nextcloud
    const target = filePath.startsWith(url)
      ? filePath
      : `${url}/remote.php/dav/files/${username}/${filePath}`

    await axios.delete(target, {
      auth: { username, password },
      headers: { 'OCS-APIRequest': 'true' }
    })
  } catch (err) {
    console.error('File delete error:', err)
  }
}


export async function deleteModelFiles(fileUrl) {
  if (!fileUrl) return;

  try {
    // Удаляем основной файл
    await deleteFile(fileUrl)
  } catch (error) {
    console.error('Ошибка удаления файлов модели:', error);
    throw error; // Пробрасываем ошибку для обработки выше
  }
}