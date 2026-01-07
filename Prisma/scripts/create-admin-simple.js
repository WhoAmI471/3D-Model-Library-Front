// Простой скрипт для создания администратора через прямой SQL
import { exec } from 'child_process'
import { promisify } from 'util'
import bcrypt from 'bcrypt'
import { config } from 'dotenv'

config()

const execAsync = promisify(exec)

async function main() {
  const hashed = await bcrypt.hash('DT_admin', 10)
  const allPermissions = [
    'manage_users',
    'create_projects',
    'delete_models',
    'upload_models',
    'edit_models',
    'edit_model_description',
    'edit_model_sphere',
    'edit_model_screenshots',
    'download_models',
    'edit_projects',
    'add_sphere'
  ]

  const permissionsArray = `{${allPermissions.map(p => `"${p}"`).join(',')}}`

  // Проверяем, существует ли администратор
  const checkCmd = `docker exec 3dmodel_postgres psql -U postgres -d 3d_library -t -c "SELECT COUNT(*) FROM \\"User\\" WHERE email = 'admin@admin.com';"`
  
  try {
    const { stdout: count } = await execAsync(checkCmd)
    const exists = parseInt(count.trim()) > 0

    if (exists) {
      // Обновляем существующего админа
      const updateCmd = `docker exec 3dmodel_postgres psql -U postgres -d 3d_library -c "UPDATE \\"User\\" SET permissions = '${permissionsArray}' WHERE email = 'admin@admin.com';"`
      await execAsync(updateCmd)
      console.log('Admin updated with all permissions')
    } else {
      // Создаем нового админа
      const insertCmd = `docker exec 3dmodel_postgres psql -U postgres -d 3d_library -c "INSERT INTO \\"User\\" (id, name, email, password, role, permissions, \\"createdAt\\") VALUES (gen_random_uuid(), 'Admin', 'admin@admin.com', '${hashed}', 'ADMIN', '${permissionsArray}', NOW());"`
      await execAsync(insertCmd)
      console.log('Admin created with all permissions')
      console.log('Email: admin@admin.com')
      console.log('Password: DT_admin')
    }
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()

