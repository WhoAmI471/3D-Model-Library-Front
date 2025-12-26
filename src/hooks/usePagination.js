'use client'
import { useState, useEffect, useMemo } from 'react'

/**
 * Хук для управления пагинацией списка элементов
 * 
 * @param {Array} items - Массив элементов для пагинации
 * @param {number} itemsPerPage - Количество элементов на странице
 * @param {Array} dependencies - Зависимости для сброса страницы (например, [searchTerm, activeTab])
 * @returns {Object} Объект с данными пагинации и методами управления
 */
export function usePagination(items = [], itemsPerPage = 16, dependencies = []) {
  const [currentPage, setCurrentPage] = useState(1)

  // Сброс страницы при изменении зависимостей (поиск, фильтры и т.д.)
  useEffect(() => {
    setCurrentPage(1)
  }, dependencies)

  const totalPages = useMemo(() => {
    return Math.ceil(items.length / itemsPerPage)
  }, [items.length, itemsPerPage])

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return items.slice(startIndex, endIndex)
  }, [items, currentPage, itemsPerPage])

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const goToFirstPage = () => {
    setCurrentPage(1)
  }

  const goToLastPage = () => {
    setCurrentPage(totalPages)
  }

  return {
    currentPage,
    totalPages,
    paginatedItems,
    itemsPerPage,
    totalItems: items.length,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setCurrentPage
  }
}

