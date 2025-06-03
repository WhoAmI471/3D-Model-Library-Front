import { ROLES, PERMISSIONS } from './roles';


export const checkPermission = (userRole, permission) => {
  if (!userRole) return false;
  return PERMISSIONS[userRole]?.includes(permission) || false;
};
