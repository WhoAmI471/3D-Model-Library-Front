'use client'
import ErrorBoundary from './ErrorBoundary'
import { logErrorToServer } from '@/lib/errorHandler'

export default function ErrorBoundaryWrapper({ children }) {
  const handleError = async (error, errorInfo) => {
    // Отправляем ошибку на сервер для логирования
    await logErrorToServer(error, {
      componentStack: errorInfo?.componentStack,
      errorBoundary: true
    })
  }

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}
