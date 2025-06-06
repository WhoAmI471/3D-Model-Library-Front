import { ROLES, ALL_PERMISSIONS } from '../../src/lib/roles.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const users = await prisma.user.findMany();
const getRecommendedPermissions = (role) => {
    const recommendations = {
       [ROLES.ADMIN]: [
          ALL_PERMISSIONS.MANAGE_USERS,
          ALL_PERMISSIONS.CREATE_PROJECTS,
          ALL_PERMISSIONS.DELETE_MODELS,
          ALL_PERMISSIONS.UPLOAD_MODELS,
          ALL_PERMISSIONS.EDIT_MODELS,
          ALL_PERMISSIONS.DOWNLOAD_MODELS,
          ALL_PERMISSIONS.EDIT_PROJECTS
        ],
        [ROLES.ARTIST]: [
          ALL_PERMISSIONS.UPLOAD_MODELS,
          ALL_PERMISSIONS.EDIT_MODELS,
          ALL_PERMISSIONS.DOWNLOAD_MODELS
        ],
        [ROLES.PROGRAMMER]: [
          ALL_PERMISSIONS.DOWNLOAD_MODELS
        ],
        [ROLES.MANAGER]: [
          ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION,
          ALL_PERMISSIONS.DOWNLOAD_MODELS,
          ALL_PERMISSIONS.CREATE_PROJECTS,
          ALL_PERMISSIONS.EDIT_PROJECTS
        ],
        [ROLES.ANALYST]: [
          ALL_PERMISSIONS.EDIT_MODEL_DESCRIPTION,
          ALL_PERMISSIONS.DOWNLOAD_MODELS,
          ALL_PERMISSIONS.CREATE_PROJECTS,
          ALL_PERMISSIONS.EDIT_PROJECTS
        ]
    };
    return recommendations[role] || [];
  };
for (const user of users) {
  const recommendedPermissions = getRecommendedPermissions(user.role);
  await prisma.user.update({
    where: { id: user.id },
    data: { permissions: { set: recommendedPermissions } }
  });
}