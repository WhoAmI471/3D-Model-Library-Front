// src/lib/parseFormData.js
export async function parseFormData(request) {
    const formData = await request.formData();
    const fields = {};
    const files = {};
  
    for (const [key, value] of formData.entries()) {
      if (value instanceof Blob && value.size > 0) {
        // Для файлов
        if (files[key]) {
          if (Array.isArray(files[key])) {
            files[key].push(value);
          } else {
            files[key] = [files[key], value];
          }
        } else {
          files[key] = value;
        }
      } else {
        // Для обычных полей
        fields[key] = value;
      }
    }
  
    return { fields, files };
  }