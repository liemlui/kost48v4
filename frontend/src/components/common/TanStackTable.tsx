import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Table } from 'react-bootstrap';
import { ChevronUp, ChevronDown, ChevronsUpDown, Columns } from 'lucide-react';

type Props<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  showColumnToggle?: boolean;
  className?: string;
};

export default function TanStackTable<T>({
  columns, data, onRowClick, rowLabel, isLoading, emptyMessage = 'Tidak ada data.', showColumnToggle = false, className = '',
}: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showToggle, setShowToggle] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className={`tanstack-table-wrapper ${className}`}>
      {showColumnToggle && (
        <div className="d-flex justify-content-end mb-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            onClick={() => setShowToggle((v) => !v)}
            aria-expanded={showToggle}
          >
            <Columns size={14} /> Kolom
          </button>
          {showToggle && (
            <div
              className="position-absolute bg-white border rounded shadow-sm p-2 d-flex flex-column gap-1"
              style={{ zIndex: 50, marginTop: 32, right: 0, minWidth: 160 }}
            >
              {table.getAllLeafColumns().map((col) => (
                <label key={col.id} className="d-flex align-items-center gap-2 small mb-0" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={col.getToggleVisibilityHandler()}
                  />
                  {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <Table hover responsive className={`responsive-data-table ${className}`}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    style={{ cursor: canSort ? 'pointer' : undefined, userSelect: canSort ? 'none' : undefined, whiteSpace: 'nowrap' }}
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : canSort ? 'none' : undefined}
                  >
                    <span className="d-inline-flex align-items-center gap-1">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort ? (
                        <span aria-hidden className="text-muted" style={{ fontSize: '0.75em' }}>
                          {sorted === 'asc' ? <ChevronUp size={12} /> : sorted === 'desc' ? <ChevronDown size={12} /> : <ChevronsUpDown size={12} />}
                        </span>
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={columns.length} className="text-center text-muted py-3">Memuat…</td></tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center text-muted py-3">{emptyMessage}</td></tr>
          ) : (
            table.getRowModel().rows.map((row) => {
              const clickable = Boolean(onRowClick);
              function handleRowKey(e: React.KeyboardEvent<HTMLTableRowElement>) {
                if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick!(row.original);
                }
              }
              return (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={clickable ? handleRowKey : undefined}
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? 'button' : undefined}
                aria-label={clickable && rowLabel ? rowLabel(row.original) : undefined}
                style={clickable ? { cursor: 'pointer' } : undefined}
                className={clickable ? 'clickable-row' : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} data-label={typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : undefined}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              );
            })
          )}
        </tbody>
      </Table>
    </div>
  );
}
