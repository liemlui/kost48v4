import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import PaginationControls from '../../components/common/PaginationControls';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import { type TicketItem, type StatusTab, getStaffStatusText, getStatusClass, getStaffCategoryText, getStaffLocation, staffSortScore } from './ticketsShared';

export default function StaffTicketsMode({
  items,
  isLoading,
  isError,
  activeTab,
  setActiveTab,
  simpleAction,
  setDoneTicket,
}: {
  items: TicketItem[];
  isLoading: boolean;
  isError: boolean;
  activeTab: StatusTab;
  setActiveTab: (tab: StatusTab) => void;
  simpleAction: any;
  setDoneTicket: (ticket: TicketItem | null) => void;
}) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const activeWork = useMemo(
    () => items.filter((item) => item.status !== 'CLOSED').sort((a, b) => staffSortScore(a) - staffSortScore(b) || new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()),
    [items],
  );

  const openCount = activeWork.filter((item) => item.status === 'OPEN').length;
  const progressCount = activeWork.filter((item) => item.status === 'IN_PROGRESS').length;
  const doneCount = activeWork.filter((item) => item.status === 'DONE').length;

  const visibleItems = activeWork.filter((item) => {
    if (activeTab === 'ALL') return item.status === 'OPEN' || item.status === 'IN_PROGRESS' || item.status === 'DONE';
    if (activeTab === 'URGENT') return item.status === 'OPEN';
    if (activeTab === 'OPEN' || activeTab === 'IN_PROGRESS' || activeTab === 'DONE') return item.status === activeTab;
    return false;
  });

  useEffect(() => { setPage(1); }, [activeTab]);

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const pagedItems = visibleItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chips: { key: StatusTab; label: string; count: number; icon: string }[] = [
    { key: 'ALL', label: 'Semua tugas', count: openCount + progressCount, icon: '📋' },
    { key: 'URGENT', label: 'Kerjakan dulu', count: openCount, icon: '🔥' },
    { key: 'IN_PROGRESS', label: 'Sedang dikerjakan', count: progressCount, icon: '🛠️' },
    { key: 'DONE', label: 'Tunggu dicek', count: doneCount, icon: '👀' },
  ];

  return (
    <div className="staff-simple-mode">
      <PageHeader eyebrow="Pekerjaan Lapangan" title="Tugas Lapangan" description="Kerjakan dari atas ke bawah. Mulai tugas, selesaikan, lalu kirim catatan dan foto bukti." />
      <div className="staff-work-scope-note">Halaman ini hanya untuk mengerjakan tugas aktif. Laporan baru dibuat dari Beranda Kerja atau Cek Kamar.</div>
      {simpleAction.isError ? <Alert variant="danger" className="staff-alert">Aksi gagal. Coba sekali lagi.</Alert> : null}
      {isError ? <Alert variant="danger" className="staff-alert">Tugas belum bisa dimuat. Coba muat ulang halaman.</Alert> : null}
      <Card className="staff-work-panel border-0">
        <Card.Body>
          <SegmentedTabs
            ariaLabel="Pilih jenis tugas"
            size="md"
            value={activeTab}
            onChange={setActiveTab}
            items={chips.map((chip) => ({ key: chip.key, label: chip.label, icon: chip.icon, count: chip.count }))}
          />
          {isLoading ? <div className="staff-empty-box">Memuat tugas...</div> : null}
          {!isLoading && !isError && !visibleItems.length ? (
            <div className="staff-empty-box"><strong>Tidak ada tugas sekarang.</strong><span>Kalau ada pekerjaan baru, akan muncul di sini.</span></div>
          ) : null}
          {!isLoading && !isError && visibleItems.length ? (
            <div className="staff-work-list">
              {pagedItems.map((item, index) => (
                <article key={item.id} className={`staff-work-card staff-status-${item.status.toLowerCase()}`}>
                  <div className="staff-work-rank">{(page - 1) * PAGE_SIZE + index + 1}</div>
                  <div className="staff-work-main">
                    <div className="staff-work-topline">
                      <span className={`staff-status-pill status-${getStatusClass(item.status)}`}>{getStaffStatusText(item.status)}</span>
                      <span className="staff-category-pill">{getStaffCategoryText(item.category)}</span>
                    </div>
                    <h3>{item.title || item.ticketNumber || `Tiket #${item.id}`}</h3>
                    <p>{getStaffLocation(item)}</p>
                    {item.description ? <small>{item.description}</small> : null}
                  </div>
                  <div className="staff-work-action">
                    {item.status === 'OPEN' ? <Button size="sm" className="staff-action-button" disabled={simpleAction.isPending} onClick={() => simpleAction.mutate({ path: `/tickets/${item.id}/start` })}>Mulai Kerjakan</Button> : null}
                    {item.status === 'IN_PROGRESS' ? <Button size="sm" variant="success" className="staff-action-button" disabled={simpleAction.isPending} onClick={() => setDoneTicket(item)}>Kirim Bukti</Button> : null}
                    {item.status === 'DONE' ? <span className="staff-done-note">Menunggu admin cek</span> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {!isLoading && !isError && visibleItems.length > PAGE_SIZE ? (
            <div className="staff-work-pagination">
              <PaginationControls currentPage={page} totalPages={totalPages} totalItems={visibleItems.length} pageSize={PAGE_SIZE} onPageChange={setPage} isLoading={isLoading || simpleAction.isPending} />
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </div>
  );
}
