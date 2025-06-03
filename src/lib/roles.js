// lib/roles.js
export const ROLES = {
    ADMIN: 'ADMIN',
    // LEAD: 'LEAD',
    ARTIST: 'ARTIST',
    PROGRAMMER: 'PROGRAMMER',
    MANAGER: 'MANAGER',
    ANALYST: 'ANALYST'
  };
  
  export const PERMISSIONS = {
    // Администратор (Руководитель компании)
    [ROLES.ADMIN]: [
      'manage_users',
      'create_projects',
      'delete_models',
      'upload_models',
      'edit_models',
      'download_models'
    ],
    
    // Руководитель 3D отдела
    // [ROLES.LEAD]: [
    //   'create_projects',
    //   'delete_models',
    //   'upload_models',
    //   'update_models',
    //   'edit_models',
    // //   'print_models',
    // //   'share_model_links',
    //   'download_models'
    // ],
    
    // 3D-художник
    [ROLES.ARTIST]: [
      'upload_models',
      'delete_models',
      'edit_models',
      'download_models'
    ],
    
    // Программист
    [ROLES.PROGRAMMER]: [
      'download_models'
    ],
    
    // Проект-менеджер и Аналитик
    [ROLES.MANAGER]: [
        'edit_model_description',
        'download_models',
        'create_projects',
        'edit_projects'
    ],
    [ROLES.ANALYST]: [
        'edit_model_description',
        'download_models',
        'create_projects',
        'edit_projects'
    ]
  };