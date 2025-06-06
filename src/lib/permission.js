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