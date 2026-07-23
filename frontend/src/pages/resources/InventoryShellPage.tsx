import PageHeader from '../../components/common/PageHeader';
import { useState } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import SegmentedTabs, { type SegmentedTabItem } from '../../components/common/SegmentedTabs';
import AiResultPanel from '../../components/ai/AiResultPanel';
import InventorySummaryPanel from '../../components/inventory/InventorySummaryPanel';
import { draftInventoryReorder, getOwnerAiStatus, type InventoryReorderDraftResult } from '../../api/ai';
import { useAuth } from '../../context/AuthContext';

// FASE B-2: shell Inventaris terpadu. Tab berbasis PATH (`/inventory/<key>`) supaya
// pembersihan query param prefill di SimpleCrudPage tidak menghapus tab aktif.
const TABS = [
  { key: 'gudang', label: 'Gudang', icon: '🧰' },
  { key: 'barang-kamar', label: 'Barang Kamar', icon: '🪑' },
  { key: 'mutasi', label: 'Mutasi', icon: '🔄' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function InventoryShellPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [aiResult, setAiResult] = useState<InventoryReorderDraftResult | null>(null);
  const [aiError, setAiError] = useState('');
  const active: TabKey = TABS.find((tab) => location.pathname.startsWith(`/inventory/${tab.key}`))?.key ?? 'gudang';
  const items: SegmentedTabItem<TabKey>[] = TABS.map((tab) => ({ key: tab.key, label: tab.label, icon: tab.icon }));
  const canUseAiRole = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const ownerAiStatusQuery = useQuery({
    queryKey: ['owner-ai', 'status', 'inventory'],
    queryFn: getOwnerAiStatus,
    enabled: canUseAiRole,
    staleTime: 300_000,
    retry: 1,
  });
  const canUseAi = canUseAiRole && ownerAiStatusQuery.data?.configured === true;
  const reorderAi = useMutation({
    mutationFn: draftInventoryReorder,
    onSuccess: (result) => {
      setAiResult(result);
      setAiError('');
    },
    onError: (err: any) => {
      setAiResult(null);
      setAiError(err?.response?.data?.message || err?.message || 'Gagal meminta cek stok AI.');
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Master Data"
        title="Inventaris"
        description="Stok gudang, barang per kamar, dan mutasi resmi dalam satu tempat."
        secondaryAction={canUseAi ? (
          <Button
            size="sm"
            variant="outline-primary"
            disabled={reorderAi.isPending}
            onClick={() => reorderAi.mutate()}
          >
            {reorderAi.isPending ? 'Mengecek stok...' : 'Cek Stok AI'}
          </Button>
        ) : undefined}
      />
      <div className="inventory-shell">
      {aiError ? (
        <Alert variant="danger" className="py-2 px-3 small">
          {aiError}
        </Alert>
      ) : null}
      {aiResult ? (
        <AiResultPanel
          title="Saran AI Stok"
          mode={aiResult.mode}
          fallback={aiResult.fallback}
          warnings={aiResult.warnings}
          missingData={aiResult.missingData}
          usage={aiResult.usage}
          model={aiResult.model}
        >
          {aiResult.result.lowStockItems.length ? (
            <div className="mb-2">
              <strong>Low stock:</strong>
              <ul className="mb-0 ps-3">
                {aiResult.result.lowStockItems.slice(0, 8).map((item) => (
                  <li key={`${item.inventoryItemId}-${item.name}`}>
                    {item.name}: {item.currentQty} tersisa, min {item.suggestedMinQty}. {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mb-2">Tidak ada item low stock dari snapshot saat ini.</div>
          )}
          {aiResult.result.purchaseSuggestions.length ? (
            <div className="mb-2">
              <strong>Saran beli:</strong>
              <ul className="mb-0 ps-3">
                {aiResult.result.purchaseSuggestions.slice(0, 8).map((item) => (
                  <li key={`${item.name}-${item.qty}`}>
                    {item.name}: {item.qty} unit ({item.priority})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {aiResult.result.warnings.length ? (
            <div className="text-muted">{aiResult.result.warnings.join(' ')}</div>
          ) : null}
        </AiResultPanel>
      ) : null}
      <InventorySummaryPanel />
      <SegmentedTabs
        items={items}
        value={active}
        onChange={(key) => navigate(`/inventory/${key}`)}
        ariaLabel="Area inventaris"
        size="md"
      />
      <div className="mt-3">
        <Outlet />
      </div>
    </div>
    </div>
  );
}
