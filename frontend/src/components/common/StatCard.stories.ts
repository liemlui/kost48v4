import type { Meta, StoryObj } from '@storybook/react';
import StatCard from './StatCard';

const meta: Meta<typeof StatCard> = {
  title: 'Common/StatCard',
  component: StatCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: {
    title: 'Total Penghuni',
    value: '12',
    subtitle: 'Aktif bulan ini',
    icon: '👤',
  },
};

export const Danger: Story = {
  args: {
    title: 'Tagihan Tertunda',
    value: 'Rp 2.5jt',
    subtitle: '3 tagihan belum dibayar',
    variant: 'danger',
    icon: '⚠️',
  },
};

export const Warning: Story = {
  args: {
    title: 'Meter Belum Dicatat',
    value: '5',
    subtitle: 'Kamar tanpa catatan bulan ini',
    variant: 'warning',
    icon: '📊',
  },
};

export const WithTrend: Story = {
  args: {
    title: 'Okupansi',
    value: '75%',
    subtitle: 'Dari 48 kamar',
    icon: '📈',
    trend: { value: 12, label: 'naik 12%' },
  },
};

export const Loading: Story = {
  args: {
    title: 'Pendapatan',
    value: '—',
    subtitle: 'Bulan ini',
    loading: true,
    icon: '💰',
  },
};
