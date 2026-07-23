const announcementAudienceOptions = [
  { value: 'TENANT', label: 'Tenant' },
  { value: 'ALL', label: 'Semua' },
];

export const communicationsConfigs = {
  announcements: {
    title: 'Pengumuman & Komunikasi',
    supportsIsActiveFilter: true,
    path: '/announcements',
    emptyMessage: 'Belum ada pengumuman. Klik "Buat Pengumuman" untuk membuat pengumuman pertama.',
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
        name: 'imageUrl',
        label: 'Gambar Cover',
        type: 'text' as const,
        placeholder: 'Unggah gambar cover pengumuman',
      },
      { name: 'imageFileKey', label: 'Image file key', type: 'hidden' as const },
      { name: 'imageOriginalFilename', label: 'Image filename', type: 'hidden' as const },
      { name: 'imageMimeType', label: 'Image MIME type', type: 'hidden' as const },
      { name: 'imageFileSizeBytes', label: 'Image file size', type: 'hidden' as const },
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
