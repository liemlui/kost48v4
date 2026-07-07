import type { Meta, StoryObj } from '@storybook/react';
import EmptyState from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'Common/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: '📭',
    title: 'Belum ada data',
    description: 'Data akan muncul setelah aktivitas pertama.',
  },
};

export const WithAction: Story = {
  args: {
    icon: '➕',
    title: 'Belum ada kamar',
    description: 'Tambahkan kamar baru untuk mulai.',
    action: { label: 'Tambah Kamar', onClick: () => alert('Tambah Kamar clicked') },
  },
};

export const WithDescription: Story = {
  args: {
    icon: '🔍',
    title: 'Pencarian tidak ditemukan',
    description: 'Coba gunakan kata kunci lain atau filter yang berbeda.',
  },
};
