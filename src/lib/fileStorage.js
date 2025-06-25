// src/lib/fileStorage.js
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeName } from './nextcloud';
import { createFolderRecursive } from './nextcloud';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

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

    if (nextcloud) {
      const { url, username, password } = nextcloud;
      await createFolderRecursive(subfolder);
      const folderUrl = `${url}/remote.php/dav/files/${username}/${subfolder}`;

      const uploadUrl = `${folderUrl}/${fileName}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await axios.put(uploadUrl, buffer, {
        auth: { username, password },
        headers: { 'OCS-APIRequest': 'true', 'Content-Type': file.type || 'application/octet-stream' }
      });
      return uploadUrl;
    }

    // Локальное хранение если нет конфигурации Nextcloud
    const uploadDir = path.join(UPLOADS_DIR, subfolder);
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    return `/uploads/${subfolder}/${fileName}`;
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
  const nextcloud = getNextcloudConfig();
  try {
    if (!filePath) return;

    if (nextcloud && filePath.startsWith(nextcloud.url)) {
      const { username, password } = nextcloud;
      await axios.delete(filePath, {
        auth: { username, password },
        headers: { 'OCS-APIRequest': 'true' }
      });
      return;
    }

    const fullPath = path.join(process.cwd(), 'public', filePath);
    await fs.unlink(fullPath);
  } catch (err) {
    console.error('File delete error:', err);
  }
}


export async function deleteModelFiles(fileUrl) {
  if (!fileUrl) return;

  try {
    // Удаляем основной файл
    await deleteFile(fileUrl);

    const nextcloud = getNextcloudConfig();

    if (!nextcloud || !fileUrl.startsWith(nextcloud.url)) {
      const baseName = path.basename(fileUrl, path.extname(fileUrl));
      const dirPath = path.join(process.cwd(), 'public', path.dirname(fileUrl));
      try {
        const files = await fs.readdir(dirPath);
        await Promise.all(
          files
            .filter(file => file.startsWith(baseName))
            .map(file => deleteFile(path.join(path.dirname(fileUrl), file)))
        );
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
    }
  } catch (error) {
    console.error('Ошибка удаления файлов модели:', error);
    throw error; // Пробрасываем ошибку для обработки выше
  }
}