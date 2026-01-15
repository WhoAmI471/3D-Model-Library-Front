export const checkPermission = (user, permission) => {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
};

// Дополнительные хелперы для проверки прав
export const checkAnyPermission = (user, ...permissions) => {
  if (!user || !user.permissions) return false;
  return permissions.some(perm => user.permissions.includes(perm));
};

export const checkAllPermissions = (user, ...permissions) => {
  if (!user || !user.permissions) return false;
  return permissions.every(perm => user.permissions.includes(perm));
};

// Проверка, может ли пользователь редактировать конкретную модель
export const canEditModel = (user, model) => {
  if (!user || !user.permissions) return false;
  if (!model) return false;
  
  // Проверяем общие права на редактирование
  const hasEditPermission = checkAnyPermission(user, 'edit_models', 'edit_model_description');
  if (!hasEditPermission) return false;
  
  // Для Художника дополнительная проверка
  if (user.role === 'ARTIST') {
    // Если есть право на редактирование всех моделей, разрешаем
    if (checkPermission(user, 'edit_all_models')) {
      return true;
    }
    
    // Иначе проверяем, является ли пользователь автором модели
    // Если модель не имеет автора (authorId === null или undefined), Художник не может её редактировать
    if (!model.authorId) {
      return false;
    }
    
    // Проверяем, что автор модели совпадает с текущим пользователем
    return model.authorId === user.id;
  }
  
  // Для остальных ролей достаточно общего права
  return true;
};