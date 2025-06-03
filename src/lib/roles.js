// lib/roles.js
export const ROLES = {
    ADMIN: 'ADMIN',
    DEPARTMENT_LEAD: 'DEPARTMENT_LEAD',
    ARTIST: 'ARTIST',
    PROGRAMMER: 'PROGRAMMER',
    PROJECT_MANAGER: 'PROJECT_MANAGER',
    ANALYST: 'ANALYST'
  };
  
  export const PERMISSIONS = {
    // Администратор (Руководитель компании)
    [ROLES.ADMIN]: [
      'manage_users',
      'create_projects',
      'delete_models',
      'upload_models',
      'edit_model_descriptions',
      'rename_models',
      'share_model_links'
    ],
    
    // Руководитель 3D отдела
    [ROLES.DEPARTMENT_LEAD]: [
      'create_projects',
      'delete_models',
      'upload_models',
      'update_models',
      'edit_model_descriptions',
      'print_models',
      'share_model_links'
    ],
    
    // 3D-художник
    [ROLES.ARTIST]: [
      'upload_models',
      'update_models',
      'edit_model_descriptions',
      'print_models',
      'share_model_links'
    ],
    
    // Программист
    [ROLES.PROGRAMMER]: [
      'rename_models',
      'share_model_links'
    ],
    
    // Проект-менеджер и Аналитик
    [ROLES.PROJECT_MANAGER]: ['share_model_links'],
    [ROLES.ANALYST]: ['share_model_links']
  };