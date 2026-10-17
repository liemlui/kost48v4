import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiPricingCard from '../../components/settings/AiPricingCard';
import type { OwnerAiPricing, OwnerAiUsage } from '../../api/ai';

const pricing: OwnerAiPricing = {
  version: 3,
  currency: 'USD',
  updatedAt: '2026-10-18T00:00:00.000Z',
  source: 'ai-refresh-official-page',
  sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
  models: {
    'deepseek-flash': {
      cacheHitInputUsdPer1M: { offPeak: 0.003, peak: 0.006 },
      cacheMissInputUsdPer1M: { offPeak: 0.15, peak: 0.3 },
      outputUsdPer1M: { offPeak: 0.6, peak: 1.2 },
    },
    'deepseek-v4-pro': {
      cacheHitInputUsdPer1M: { offPeak: 0.022, peak: 0.044 },
      cacheMissInputUsdPer1M: { offPeak: 0.66, peak: 1.32 },
      outputUsdPer1M: { offPeak: 1.98, peak: 3.96 },
    },
  },
};

const usage: OwnerAiUsage = {
  enabled: true,
  dailyLimit: 50,
  todayTotal: 2,
  remainingDaily: 48,
  byFeature: { brief: 1 },
  tokens: { prompt: 1000, completion: 200, total: 1200, cacheHit: 300, cacheMiss: 700, byFeature: { brief: 1200 } },
  estimatedCostUsd: 0.00075,
  pricedCalls: 2,
  unpricedCalls: 0,
  pricing,
  recentAudit: [],
};

describe('Fitur harga AI — kartu pengaturan', () => {
  it('menampilkan tabel harga resmi dan estimasi biaya dari token usage', () => {
    render(
      <AiPricingCard pricing={pricing} usage={usage} isOwner refreshing={false} onRefresh={() => {}} />,
    );

    expect(screen.getByText('Harga AI (USD / 1 juta token)')).toBeInTheDocument();
    expect(screen.getByText('deepseek-flash')).toBeInTheDocument();
    expect(screen.getByText('deepseek-v4-pro')).toBeInTheDocument();
    expect(screen.getByText('versi 3')).toBeInTheDocument();
    expect(screen.getByText('$0.00075')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
  });

  it('tombol refresh memanggil handler dan menampilkan status memproses', async () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <AiPricingCard pricing={pricing} usage={usage} isOwner refreshing={false} onRefresh={onRefresh} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Perbarui harga via AI/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    rerender(<AiPricingCard pricing={pricing} usage={usage} isOwner refreshing onRefresh={onRefresh} />);
    expect(screen.getByRole('button', { name: /Memperbarui/i })).toBeDisabled();
  });

  it('ADMIN/non-owner tidak melihat tombol refresh', () => {
    render(<AiPricingCard pricing={pricing} usage={usage} isOwner={false} refreshing={false} onRefresh={() => {}} />);
    expect(screen.queryByRole('button', { name: /Perbarui harga via AI/i })).not.toBeInTheDocument();
  });

  it('menampilkan error dan peringatan sumber AI', () => {
    render(
      <AiPricingCard
        pricing={pricing}
        usage={usage}
        isOwner
        refreshing={false}
        onRefresh={() => {}}
        refreshError="Halaman resmi tidak bisa diambil"
        refreshWarnings={['Harga berasal dari pengetahuan model AI']}
      />,
    );

    expect(screen.getByText('Halaman resmi tidak bisa diambil')).toBeInTheDocument();
    expect(screen.getByText(/Harga berasal dari pengetahuan model AI/)).toBeInTheDocument();
  });
});
