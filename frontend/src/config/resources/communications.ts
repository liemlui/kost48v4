const announcementAudienceOptions = [
  { value: 'TENANT', label: 'Tenant' },
  { value: 'ALL', label: 'Semua' },
];

export const communicationsConfigs = {
  announcements: {
    title: 'Pengumuman & Komunikasi',
    supportsIsActiveFilter: true,
    path: '/announcements',
    createLabel: 'Buat Pengumuman',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Judul' },
      { key: 'audience', label: 'Audiens' },
      { key: 'isPublished', label: 'Published' },
      { key: 'isPinned', label: 'Pinned' },
      { key: 'publishedAt', label: 'Tgl Publish' },
    ],
    fields: [
      {
        name: 'title',
        label: 'Judul',
        type: 'text' as const,
        placeholder: 'Judul pengumuman',
        required: true,
      },
      {
        name: 'content',
        label: 'Konten',
        type: 'textarea' as const,
        placeholder: 'Isi pengumuman',
        required: true,
      },
      {
        name: 'audience',
        label: 'Audiens',
        type: 'select' as const,
        options: announcementAudienceOptions,
        required: true,
      },
      { name: 'isPublished', label: 'Published', type: 'checkbox' as const },
      { name: 'isPinned', label: 'Pinned', type: 'checkbox' as const },
      {
        name: 'startsAt',
        label: 'Mulai Tayang',
        type: 'date' as const,
        placeholder: 'Tanggal mulai tayang',
      },
      {
        name: 'expiresAt',
        label: 'Berakhir',
        type: 'date' as const,
        placeholder: 'Tanggal berakhir',
      },
    ],
  },
};
