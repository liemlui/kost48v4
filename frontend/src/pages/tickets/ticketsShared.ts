import { getTicketStatusLabel } from '../../constants/staffRepairOptions';
export { compressImageFile } from '../../utils/compressImageFile';

export type TicketItem = {
  issueImageUrl?: string | null;
  resolutionImageUrl?: string | null;
  id: number;
  ticketNumber?: string;
  title?: string;
  description?: string;
  category?: string;
  status: string;
  tenantId?: number;
  roomId?: number;
  stayId?: number;
  assignedToId?: number | null;
  linkedRoomItemId?: number | null;
  linkedInventoryItemId?: number | null;
  finalRoomItemStatus?: string | null;
  finalInventoryItemStatus?: string | null;
  staffFieldReports?: any[];
  createdAt?: string;
  updatedAt?: string;
  tenant?: { id: number; fullName?: string; email?: string };
  room?: { id: number; code?: string; name?: string };
  stay?: { id: number; checkInDate?: string; checkOutDate?: string };
};

export type UserOption = { id: number; fullName: string; role: string };
export type StatusTab = 'ALL' | 'URGENT' | 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CLOSED';

export function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatRelations(item: TicketItem): string {
  const parts: string[] = [];
  if (item.tenant?.fullName) parts.push(item.tenant.fullName);
  else if (item.tenantId) parts.push(`Penghuni #${item.tenantId}`);
  if (item.room?.code || item.room?.name) parts.push(item.room.code || item.room.name || '');
  else if (item.roomId) parts.push(`Kamar #${item.roomId}`);
  if (item.stay?.id) parts.push(`Masa sewa #${item.stay.id}`);
  else if (item.stayId) parts.push(`Masa sewa #${item.stayId}`);
  return parts.join(' · ') || 'Tidak ada lokasi';
}

export function getStaffStatusText(status: string) {
  return getTicketStatusLabel(status);
}

export function cleanStaffDescription(description?: string | null) {
  if (!description) return '';
  const lines = description.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) => !/^---$/.test(line)).filter((line) => !/^(Waktu|Pelapor|RoomItem ID|InventoryItem ID|Status sementara sistem|Status final barang|Jumlah stok resmi|Keputusan final)/i.test(line));
  const note = lines.find((line) => /^Catatan:/i.test(line));
  const base = (note || lines.find((line) => !/^[A-Z_]+$/.test(line)) || lines[0] || '').replace(/^Catatan:\s*/i, '');
  return base.length > 150 ? `${base.slice(0, 147)}...` : base;
}

export function ticketHasRoomItemDecision(item?: TicketItem | null) {
  return Boolean(item?.linkedRoomItemId || item?.staffFieldReports?.some((report) => report?.roomItemId));
}

export function ticketHasInventoryDecision(item?: TicketItem | null) {
  return Boolean(item?.linkedInventoryItemId || item?.staffFieldReports?.some((report) => report?.inventoryItemId));
}

export function getStatusClass(status: string) {
  return String(status || 'secondary').toLowerCase().replace(/_/g, '-');
}

export function getStaffActionText(status: string) {
  if (status === 'OPEN') return 'Mulai Kerjakan';
  if (status === 'IN_PROGRESS') return 'Tandai Selesai';
  if (status === 'DONE') return 'Sudah selesai';
  return 'Lihat';
}

export function getStaffCategoryText(category?: string | null) {
  const value = String(category ?? '').toUpperCase();
  if (value === 'BARANG_RUSAK') return 'Barang rusak / hilang';
  if (value === 'STOK_HABIS') return 'Stok habis';
  if (value === 'CHECKOUT_INSPECTION') return 'Cek kamar keluar';
  if (value === 'CEK_KAMAR') return 'Cek kamar';
  if (value === 'CATATAN_METER') return 'Catat meter';
  if (value === 'KEBERSIHAN') return 'Bersih-bersih';
  if (value === 'PERBAIKAN') return 'Perbaikan';
  return category || 'Tugas';
}

export function getStaffLocation(item: TicketItem) {
  if (item.room?.code || item.room?.name) return `Kamar ${item.room.code || item.room.name}`;
  if (item.roomId) return `Kamar #${item.roomId}`;
  if (item.tenant?.fullName) return item.tenant.fullName;
  return 'Lokasi belum ditulis';
}

export function staffSortScore(item: TicketItem) {
  if (item.status === 'OPEN') return 0;
  if (item.status === 'IN_PROGRESS') return 1;
  if (item.status === 'DONE') return 2;
  return 9;
}
