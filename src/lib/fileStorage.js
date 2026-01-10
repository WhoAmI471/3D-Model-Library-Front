// src/lib/fileStorage.js
import path from 'path'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { sanitizeName } from './nextcloud'
import { createFolderRecursive } from './nextcloud'


function getNextcloudConfig() {
  let url = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_ADMIN_USER;
  const password = process.env.NEXTCLOUD_ADMIN_PASSWORD;
  
  if (!url || !username || !password) {
    return null;
  }
  
  // Нормализуем URL - убираем trailing slash
  url = url.replace(/\/+$/, '');
  
  // Если URL начинается с localhost и мы в Docker-окружении, пытаемся использовать имя сервиса
  if (process.env.NEXTCLOUD_DOCKER_SERVICE && url.includes('localhost')) {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        url = `${urlObj.protocol}//${process.env.NEXTCLOUD_DOCKER_SERVICE}${urlObj.port ? `:${urlObj.port}` : ''}`;
      }
    } catch (e) {
      console.warn('Не удалось разобрать NEXTCLOUD_URL:', e.message);
    }
  }
  
  return { url, username, password };
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
      throw new Error('Конфигурация Nextcloud не найдена. Проверьте переменные окружения NEXTCLOUD_URL, NEXTCLOUD_ADMIN_USER, NEXTCLOUD_ADMIN_PASSWORD');
    }

    const { url, username, password } = nextcloud;
    await createFolderRecursive(subfolder);
    const folderUrl = `${url}/remote.php/dav/files/${username}/${subfolder}`;

    const uploadUrl = `${folderUrl}/${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      await axios.put(uploadUrl, buffer, {
        auth: { username, password },
        headers: {
          'OCS-APIRequest': 'true',
          'Content-Type': file.type || 'application/octet-stream'
        },
        timeout: 60000 // 60 секунд для загрузки файла
      });
    } catch (uploadErr) {
      // Ошибка подключения при загрузке файла
      if (uploadErr.code === 'ECONNREFUSED' || uploadErr.code === 'ETIMEDOUT' || uploadErr.code === 'ENOTFOUND') {
        const originalUrl = process.env.NEXTCLOUD_URL || url;
        throw new Error(
          `Не удается подключиться к Nextcloud по адресу ${originalUrl}.\n` +
          `Проверьте:\n` +
          `1. Запущен ли контейнер Nextcloud: docker ps | grep nextcloud\n` +
          `2. Доступен ли Nextcloud: curl ${originalUrl}/status.php\n` +
          `3. Если приложение работает в Docker, возможно нужно использовать имя сервиса вместо localhost\n` +
          `4. Проверьте переменную окружения NEXTCLOUD_URL (текущее значение: ${originalUrl})`
        );
      }
      // Ошибка аутентификации
      if (uploadErr.response?.status === 401 || uploadErr.response?.status === 403) {
        throw new Error('Ошибка аутентификации в Nextcloud. Проверьте учетные данные (NEXTCLOUD_ADMIN_USER, NEXTCLOUD_ADMIN_PASSWORD).');
      }
      throw uploadErr;
    }
    return uploadUrl;
  } catch (err) {
    console.error('File save error:', err);
    // Если ошибка уже содержит понятное сообщение, пробрасываем как есть
    if (err.message && (err.message.includes('Nextcloud') || err.message.includes('конфигурация'))) {
      throw err;
    }
    // Иначе создаем понятное сообщение
    throw new Error(`Ошибка при сохранении файла: ${err.message || 'Неизвестная ошибка'}`);
  }
}

export async function saveModelFile(file, modelTitle, version, isScreenshot = false) {
  const folder = modelSubfolder(modelTitle, version, isScreenshot)
  return saveFile(file, folder)
}

export async function saveProjectImage(file, projectName) {
  const folderName = sanitizeName(projectName)
  const folder = `projects/${folderName}`
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