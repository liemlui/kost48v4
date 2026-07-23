import { Button, Card, Spinner, Badge } from 'react-bootstrap';
import { useConfirm } from '../../components/common/ConfirmProvider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import { listActiveAdditionalServices, createServiceInterest, listMyServiceInterests, type AdditionalService } from '../../api/additionalServices';
import { formatRupiah } from '../../utils/formatCurrency';

// D-25: nomor WA owner-settable via Settings (fallback env var → default)
const KOST_WHATSAPP_NUMBER = (import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '6285648887628').replace(/\D/g, '');
const WHATSAPP_URL = `https://wa.me/${KOST_WHATSAPP_NUMBER}`;
const KOST_WHATSAPP_DISPLAY = `0${KOST_WHATSAPP_NUMBER.slice(2)}`.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');

export default function WifiOrderPage() {
  const confirm = useConfirm();
  const qc = useQueryClient();

  const servicesQuery = useQuery({
    queryKey: ['active-additional-services'],
    queryFn: listActiveAdditionalServices,
    staleTime: 60_000,
  });

  const myInterestsQuery = useQuery({
    queryKey: ['my-service-interests'],
    queryFn: listMyServiceInterests,
    staleTime: 30_000,
  });

  const interestMutation = useMutation({
    mutationFn: (serviceId: number) => createServiceInterest(serviceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-service-interests'] }),
  });

  const services = (servicesQuery.data ?? []) as AdditionalService[];
  const wifiServices = services.filter((s) => /wifi|wi-fi/i.test(s.name));
  const pendingIds = new Set((myInterestsQuery.data ?? []).filter((i) => i.status === 'PENDING').map((i) => i.serviceId));

  return (
    <div>
      <PageHeader eyebrow="Portal Penghuni" title="Pesan WiFi" description="Pilih paket WiFi dan hubungi pengelola untuk proses selanjutnya." />

      {servicesQuery.isLoading ? (
        <div className="text-center py-4"><Spinner animation="border" size="sm" /> Memuat paket...</div>
      ) : (
        <>
          {/* WiFi packages from AdditionalService */}
          {wifiServices.length > 0 ? (
            <div className="d-grid gap-3">
              {wifiServices.map((svc) => {
                const alreadyRequested = pendingIds.has(svc.id);
                const isPending = interestMutation.isPending && interestMutation.variables === svc.id;
                return (
                  <Card key={svc.id} className="border-0 shadow-sm">
                    <Card.Body className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <strong>📶 {svc.name}</strong>
                          <CurrencyDisplay amount={svc.priceRupiah} />
                          {svc.unit ? <span className="text-muted small">{svc.unit}</span> : null}
                        </div>
                        {svc.description ? <div className="small text-muted">{svc.description}</div> : null}
                      </div>
                      {alreadyRequested ? (
                        <Badge bg="success-subtle" className="text-success border border-success-subtle">Sudah dipesan</Badge>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isPending}
                          onClick={async () => {
                            const ok = await confirm({ title: 'Pesan Layanan', message: `Pesan "${svc.name}" (${formatRupiah(svc.priceRupiah)})? Pengelola akan menghubungi untuk konfirmasi.`, confirmLabel: 'Pesan', variant: 'primary' });
                            if (!ok) return;
                            interestMutation.mutate(svc.id);
                          }}
                        >
                          {isPending ? 'Mengirim...' : 'Pesan Sekarang'}
                        </Button>
                      )}
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="alert alert-light border text-center">
              Paket WiFi belum tersedia. Hubungi pengelola langsung.
            </div>
          )}

          {/* WhatsApp fallback */}
          <Card className="content-card border-0 mt-3">
            <Card.Body>
              <div className="mb-2 small text-uppercase text-muted fw-semibold">Atau via WhatsApp</div>
              <div className="tenant-wifi-steps mb-2">
                <span><strong>1</strong> Chat pengelola</span>
                <span><strong>2</strong> Pilih paket</span>
                <span><strong>3</strong> Ikuti instruksi bayar</span>
              </div>
              <div className="alert alert-info small mb-2">
                <strong>Kontak WhatsApp:</strong> {KOST_WHATSAPP_DISPLAY}
              </div>
              <Button as="a" href={WHATSAPP_URL} target="_blank" rel="noreferrer" variant="outline-primary" size="sm">
                Hubungi via WhatsApp
              </Button>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}
