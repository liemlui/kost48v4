import { type DependencyList, useEffect, useMemo, useState } from 'react';

export const DEFAULT_LIST_PAGE_SIZE = 10;

export function useClientPagination<T>(
  items: T[],
  resetDeps: DependencyList = [],
  pageSize = DEFAULT_LIST_PAGE_SIZE,
) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    // resetDeps is intentionally caller-controlled so filters/search can reset page 1.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    pagedItems,
    hasPagination: totalItems > pageSize,
  };
}
