import { useMemo, useState } from 'react'
import { DEFAULT_LIST_PAGE_SIZE } from '../constants/pagination'

export interface UsePaginationResult<T> {
  page: number
  totalItems: number
  totalPages: number
  pageItems: T[]
  canPrev: boolean
  canNext: boolean
  showPagination: boolean
  rangeLabel: string
  goPrev: () => void
  goNext: () => void
}

function scrollListToTop() {
  const el = document.querySelector('.main-content')
  if (el instanceof HTMLElement) {
    el.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

export function usePagination<T>(
  items: T[],
  options?: { pageSize?: number },
): UsePaginationResult<T> {
  const pageSize = options?.pageSize ?? DEFAULT_LIST_PAGE_SIZE
  const [page, setPage] = useState(1)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endIndex = Math.min(safePage * pageSize, totalItems)

  const goPrev = () => {
    setPage((p) => Math.max(1, Math.min(p, totalPages) - 1))
    scrollListToTop()
  }

  const goNext = () => {
    setPage((p) => Math.min(totalPages, Math.min(p, totalPages) + 1))
    scrollListToTop()
  }

  return {
    page: safePage,
    totalItems,
    totalPages,
    pageItems,
    canPrev: safePage > 1,
    canNext: safePage < totalPages,
    showPagination: totalItems > pageSize,
    rangeLabel: totalItems === 0 ? '' : `${startIndex}–${endIndex} of ${totalItems}`,
    goPrev,
    goNext,
  }
}
