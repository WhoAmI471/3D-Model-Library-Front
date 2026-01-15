import { useEffect, useState } from 'react'

/**
 * Хук для debounce значения
 * @param {any} value - значение для debounce
 * @param {number} delay - задержка в миллисекундах
 * @returns {any} - debounced значение
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
