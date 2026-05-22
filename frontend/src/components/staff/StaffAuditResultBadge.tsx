export default function StaffAuditResultBadge({ result }: { result?: string }) {
  const value = String(result ?? '').toUpperCase();
  const label = value === 'PASS' ? 'Sesuai' : value === 'NEEDS_FIX' ? 'Perlu ulang' : value === 'FAILED' ? 'Gagal audit' : value === 'NOT_DONE' ? 'Belum dikerjakan' : 'Belum diaudit';
  return <span className={`staff-audit-badge audit-${value.toLowerCase()}`}>{label}</span>;
}
