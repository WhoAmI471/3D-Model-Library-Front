'use client'
import React from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    // Обновляем состояние, чтобы следующий рендер показал fallback UI
    return { 
      hasError: true,
      error
    }
  }

  componentDidCatch(error, errorInfo) {
    // Логируем ошибку в консоль
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Опционально: отправляем ошибку на сервер для логирования
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    })
    
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Если передан кастомный fallback UI, используем его
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      // Дефолтный fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Что-то пошло не так
            </h2>
            
            <p className="text-gray-600 text-center mb-6">
              Произошла неожиданная ошибка. Попробуйте обновить страницу или обратитесь к администратору.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 rounded-md">
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Детали ошибки (только в режиме разработки)
                  </summary>
                  <pre className="text-xs text-red-600 overflow-auto max-h-48 mt-2">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack && (
                      <div className="mt-2 text-gray-600">
                        {this.state.errorInfo.componentStack}
                      </div>
                    )}
                  </pre>
                </details>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Попробовать снова
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Обновить страницу
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
