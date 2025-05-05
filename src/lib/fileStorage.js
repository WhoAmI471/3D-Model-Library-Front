// src/lib/fileStorage.js
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function saveFile(file, subfolder = 'models') {
  try {
    // Создаем директории, если их нет
    const uploadDir = path.join(UPLOADS_DIR, subfolder);
    await fs.mkdir(uploadDir, { recursive: true });

    // Генерируем уникальное имя файла
    const fileExt = path.extname(file.name);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    // Сохраняем файл
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Возвращаем относительный путь для доступа через веб
    return `/uploads/${subfolder}/${fileName}`;
  } catch (err) {
    console.error('File save error:', err);
    throw err;
  }
}

export async function deleteFile(filePath) {
  try {
    if (!filePath) return;
    const fullPath = path.join(process.cwd(), 'public', filePath);
    await fs.unlink(fullPath);
  } catch (err) {
    console.error('File delete error:', err);
  }
}