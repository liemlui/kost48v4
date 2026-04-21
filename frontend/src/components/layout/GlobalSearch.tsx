import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Form, ListGroup, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { listResource } from '../../api/resources';
import type { Invoice, Room, Tenant } from '../../types';

type SearchResult =
  | { kind: 'tenant'; id: number; title: string; subtitle: string; target: string }
  | { kind: 'room'; id: number; title: string; subtitle: string; target: string }
  | { kind: 'invoice'; id: number; title: string; subtitle: string; target: string };

function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

function getPlaceholder(role?: string) {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return 'Cari tenant, kamar, invoice...';
    case 'STAFF':
      return 'Cari kamar...';
    default:
      return 'Cari data...';
  }
}

function canSearchTenants(role?: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

function canSearchInvoices(role?: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

function canSearchRooms(role?: string) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'STAFF';
}

export default function GlobalSearch({ role }: { role?: string }) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debouncedKeyword = useDebouncedValue(keyword.trim(), 300);
  const enabled = Boolean(debouncedKeyword) && role !== 'TENANT';

  const query = useQuery({
    queryKey: ['global-search', role, debouncedKeyword],
    enabled,
    queryFn: async () => {
      const tasks: Promise<SearchResult[]>[] = [];

      if (canSearchTenants(role)) {
        tasks.push(
          listResource<Tenant>('/tenants', { search: debouncedKeyword, limit: 5 })
            .then((tenants) => (tenants.items ?? []).map((item) => ({
              kind: 'tenant' as const,
              id: item.id,
              title: item.fullName,
              subtitle: [item.phone, item.email].filter(Boolean).join(' · ') || `Tenant #${item.id}`,
              target: `/tenants?search=${encodeURIComponent(item.fullName ?? '')}`,
            })))
            .catch(() => []),
        );
      }

      if (canSearchRooms(role)) {
        tasks.push(
          listResource<Room>('/rooms', { search: debouncedKeyword, limit: 5 })
            .then((rooms) => (rooms.items ?? []).map((item) => ({
              kind: 'room' as const,
              id: item.id,
              title: `${item.code}${item.name ? ` · ${item.name}` : ''}`,
              subtitle: [item.floor ? `Lantai ${item.floor}` : null, item.status].filter(Boolean).join(' · '),
              target: `/rooms/${item.id}`,
            })))
            .catch(() => []),
        );
      }

      if (canSearchInvoices(role)) {
        tasks.push(
          listResource<Invoice>('/invoices', { search: debouncedKeyword, limit: 5 })
            .then((invoices) => (invoices.items ?? []).map((item) => ({
              kind: 'invoice' as const,
              id: item.id,
              title: item.invoiceNumber || `INV-${item.id}`,
              subtitle: [item.status, item.totalAmountRupiah ? `Rp ${Number(item.totalAmountRupiah).toLocaleString('id-ID')}` : null]
                .filter(Boolean)
                .join(' · '),
              target: `/invoices/${item.id}`,
            })))
            .catch(() => []),
        );
      }

      return (await Promise.all(tasks)).flat().slice(0, 10);
    },
  });

  const showResults = isFocused && keyword.trim().length > 0 && role !== 'TENANT';
  const results = useMemo(() => query.data ?? [], [query.data]);

  if (role === 'TENANT') return null;

  return (
    <div className="position-relative" style={{ minWidth: 280, maxWidth: 420, width: '100%' }}>
      <Form.Control
        type="search"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => window.setTimeout(() => setIsFocused(false), 150)}
        placeholder={getPlaceholder(role)}
        aria-label="Pencarian global"
      />

      {showResults ? (
        <div className="position-absolute top-100 start-0 end-0 mt-2 shadow bg-white rounded-3 overflow-hidden" style={{ zIndex: 1040 }}>
          {query.isFetching ? (
            <div className="px-3 py-3 text-center text-muted">
              <Spinner size="sm" className="me-2" />
              Mencari...
            </div>
          ) : results.length ? (
            <ListGroup variant="flush">
              {results.map((result) => (
                <ListGroup.Item
                  action
                  key={`${result.kind}-${result.id}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    navigate(result.target);
                    setKeyword('');
                    setIsFocused(false);
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <div className="fw-semibold">{result.title}</div>
                      <div className="small text-muted">{result.subtitle}</div>
                    </div>
                    <span className="badge text-bg-light text-uppercase">{result.kind}</span>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <div className="px-3 py-3 text-muted">Tidak ada hasil yang cocok.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
