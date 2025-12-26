'use client'
import { ROLES } from '@/lib/roles'

/**
 * Компонент для отображения и редактирования основной информации о модели
 * (название, описание, автор, версия, сфера)
 */
export default function ModelInfoSection({
  form,
  handleChange,
  users = [],
  currentUser,
  sortedSpheres = [],
  canEditModel = false,
  canEditDescription = false,
  canEditSphere = false,
  showTitle = false,
  titleClassName = '',
  onKeyDown,
  onPaste
}) {
  return (
    <>
      {/* Название (если нужно отображать) */}
      {showTitle && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название модели <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            value={form.title || ''}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 ${titleClassName}`}
            placeholder="Введите название модели"
            required
            maxLength={50}
            disabled={!canEditModel}
          />
        </div>
      )}

      {/* Описание */}
      <div className="mb-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Описание</div>
        <textarea
          name="description"
          value={form.description || ''}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={6}
          className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
          maxLength={1000}
          placeholder="Введите описание модели..."
          disabled={!canEditModel && !canEditDescription}
        />
      </div>

      {/* Информация о модели */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Автор */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Автор</div>
          <select
            name="authorId"
            value={form.authorId || (currentUser ? currentUser.id : 'UNKNOWN')}
            onChange={handleChange}
            className={`block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 ${
              currentUser?.role !== 'ADMIN' ? 'bg-gray-50' : ''
            }`}
            required
            disabled={currentUser?.role !== 'ADMIN' || !canEditModel}
          >
            {currentUser?.role === 'ADMIN' ? (
              <>
                {currentUser && (
                  <option value={currentUser.id}>
                    {currentUser.name} (Я)
                  </option>
                )}
                <option value="UNKNOWN">Неизвестно</option>
                <option value="EXTERNAL">Сторонняя модель</option>
                {users
                  .filter(user => user.role === ROLES.ARTIST && user.id !== currentUser?.id)
                  .map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
              </>
            ) : (
              <>
                {currentUser && (
                  <option value={currentUser.id}>
                    {currentUser.name} (Я)
                  </option>
                )}
                <option value="UNKNOWN">Неизвестно</option>
                <option value="EXTERNAL">Сторонняя модель</option>
              </>
            )}
          </select>
        </div>
        
        {/* Версия */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Версия</div>
          <input
            name="version"
            value={form.version || ''}
            onChange={handleChange}
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
            maxLength={20}
            disabled={!canEditModel}
          />
        </div>
        
        {/* Сфера */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Сфера <span className="text-red-500">*</span>
          </div>
          <select
            name="sphereId"
            value={form.sphereId || ''}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm cursor-pointer text-gray-900"
            disabled={canEditModel ? false : !canEditSphere}
            style={!form.sphereId ? { color: 'rgba(156, 163, 175, 0.7)' } : {}}
          >
            <option value="" disabled hidden className="text-gray-400">
              Выберите сферу
            </option>
            {sortedSpheres.map((sphere) => (
              <option key={sphere.id} value={sphere.id} className="text-gray-900">
                {sphere.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  )
}

