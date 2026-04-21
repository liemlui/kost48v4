import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import type { Invoice } from '../../types';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPeriod(start?: string, end?: string) {
  if (!start && !end) return '-';
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function isOverdue(invoice: Invoice) {
  if (!invoice.dueDate || ['PAID', 'CANCELLED'].includes(invoice.status)) {
    return false;
  }

  const dueDate = new Date(invoice.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate.getTime() < today.getTime();
}

export default function MyInvoicesPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['portal-invoices'],
    queryFn: () => listResource<Invoice>('/invoices/my'),
  });

  const allItems = query.data?.items ?? [];
  const sortedItems = useMemo(() => {
    return [...allItems].sort((a, b) => {
      const aRank = isOverdue(a) ? 0 : ['PAID', 'CANCELLED'].includes(a.status) ? 2 : 1;
      const bRank = isOverdue(b) ? 0 : ['PAID', 'CANCELLED'].includes(b.status) ? 2 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return new Date(b.dueDate ?? 0).getTime() - new Date(a.dueDate ?? 0).getTime();
    });
  }, [allItems]);

  const handleSelectFile = (file: File | null) => {
    setSelectedFile(file);
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <div>
      <PageHeader title="Invoice Saya" description="Riwayat tagihan, status pembayaran, dan dummy upload bukti transfer Anda." />

      <Card className="content-card border-0 mb-4">
        <Card.Body>
          <div className="summary-strip">
            <div className="summary-chip">
              <span className="summary-chip-label">Total invoice</span>
              <span className="summary-chip-value">{allItems.length}</span>
            </div>
            <div className="summary-chip">
              <span className="summary-chip-label">Belum lunas</span>
              <span className="summary-chip-value">{allItems.filter((item) => ['ISSUED', 'PARTIAL'].includes(item.status)).length}</span>
            </div>
            <div className="summary-chip">
              <span className="summary-chip-label">Overdue</span>
              <span className="summary-chip-value">{allItems.filter(isOverdue).length}</span>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="content-card border-0">
        <Card.Body>
          {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {query.isError ? <Alert variant="danger">Gagal memuat invoice Anda. Silakan coba lagi.</Alert> : null}
          {!query.isLoading && !query.isError && !sortedItems.length ? (
            <EmptyState icon="🧾" title="Belum ada invoice" description="Tagihan Anda akan muncul di halaman ini saat sudah dibuat." />
          ) : null}
          {!query.isLoading && !query.isError && sortedItems.length > 0 ? (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Periode</th>
                  <th>Jatuh Tempo</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Upload Bukti</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const overdue = isOverdue(item);
                  return (
                    <tr key={item.id}>
                      <td className="fw-semibold">{item.invoiceNumber || `INV-${item.id}`}</td>
                      <td>{formatPeriod(item.periodStart, item.periodEnd)}</td>
                      <td className={overdue ? 'text-soft-danger fw-semibold' : ''}>{formatDate(item.dueDate)}</td>
                      <td><CurrencyDisplay amount={item.totalAmountRupiah} /></td>
                      <td><StatusBadge status={overdue ? 'OVERDUE' : item.status} /></td>
                      <td>
                        <Button size="sm" variant="outline-primary" onClick={() => setSelectedInvoice(item)}>
                          Upload
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : null}
        </Card.Body>
      </Card>

      <Modal show={selectedInvoice !== null} onHide={() => setSelectedInvoice(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Upload Bukti Pembayaran</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="light">
            <div className="fw-semibold mb-1">Preview dummy frontend</div>
            <div className="small">
              Form ini hanya menyiapkan UX upload bukti pembayaran.
              {' '}
              {/* TODO: Integrate with backend upload endpoint */}
              Integrasi backend upload akan disambungkan pada fase approval pembayaran berikutnya.
            </div>
          </Alert>

          <div className="mb-3">
            <div className="text-muted small">Invoice</div>
            <div className="fw-semibold">{selectedInvoice?.invoiceNumber || `INV-${selectedInvoice?.id ?? '-'}`}</div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Pilih file gambar atau PDF</Form.Label>
            <Form.Control
              type="file"
              accept="image/*,.pdf"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleSelectFile(event.currentTarget.files?.[0] ?? null)}
            />
          </Form.Group>

          {selectedFile ? (
            <Card className="border-0 bg-light">
              <Card.Body>
                <div className="fw-semibold mb-2">Preview lokal</div>
                <div className="small text-muted mb-3">{selectedFile.name}</div>
                {selectedFile.type.startsWith('image/') && previewUrl ? (
                  <img src={previewUrl} alt="Preview bukti bayar" className="img-fluid rounded border" />
                ) : selectedFile.type === 'application/pdf' && previewUrl ? (
                  <iframe title="Preview PDF" src={previewUrl} style={{ width: '100%', minHeight: 420, border: 0 }} />
                ) : (
                  <Alert variant="secondary" className="mb-0">Preview file ini belum tersedia, tetapi file sudah dipilih.</Alert>
                )}
              </Card.Body>
            </Card>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>Tutup</Button>
          <Button disabled>Submit Bukti (dummy)</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
