interface ListPaginationProps {
  page: number
  totalPages: number
  rangeLabel: string
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
}

export function ListPagination({
  page,
  totalPages,
  rangeLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: ListPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav className="list-pagination" aria-label="List pagination">
      <span className="list-pagination-range">{rangeLabel}</span>
      <div className="list-pagination-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!canPrev}
          onClick={onPrev}
        >
          Previous
        </button>
        <span className="list-pagination-page" aria-current="page">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={!canNext}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </nav>
  )
}
