import { NextResponse } from 'next/server';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false, // Отключаем встроенный парсер
  },
};

export async function POST(request) {
  try {
    // Получаем FormData из запроса
    const formData = await new Promise((resolve, reject) => {
      const formData = new FormData();
      request.body
        .pipeTo(new WritableStream({
          write(chunk) {
            formData.append('file', new Blob([chunk]), { 
              filename: 'uploaded-file',
              contentType: request.headers.get('content-type') 
            });
          },
          close() {
            resolve(formData);
          },
          abort(err) {
            reject(err);
          },
        }));
    });

    const file = formData.get('file');
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Конвертируем файл в Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Проверяем конфигурацию Nextcloud
    const nextcloudUrl = process.env.NEXTCLOUD_URL;
    const username = process.env.NEXTCLOUD_ADMIN_USER;
    const password = process.env.NEXTCLOUD_ADMIN_PASSWORD;

    if (!nextcloudUrl || !username || !password) {
      return NextResponse.json(
        { error: 'Nextcloud configuration missing' },
        { status: 500 }
      );
    }

    // Создаем папку если её нет
    try {
      await axios.request({
        method: 'MKCOL',
        url: `${nextcloudUrl}/remote.php/dav/files/${username}/3D_Models`,
        auth: { username, password },
        headers: { 'OCS-APIRequest': 'true' }
      });
    } catch (folderError) {
      if (folderError.response?.status !== 405) {
        throw folderError;
      }
    }

    // Загружаем файл
    const uploadUrl = `${nextcloudUrl}/remote.php/dav/files/${username}/3D_Models/${file.name}`;
    
    await axios.put(uploadUrl, fileBuffer, {
      auth: { username, password },
      headers: {
        'Content-Type': file.type,
        'OCS-APIRequest': 'true'
      }
    });

    return NextResponse.json({
      success: true,
      fileUrl: `${nextcloudUrl}/apps/files/?dir=/3D_Models&openfile=${file.name}`
    });

  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}