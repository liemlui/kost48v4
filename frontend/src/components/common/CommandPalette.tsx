import { useEffect, useRef } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNavigationLinks, ownerAdminSections, ownerSections } from '../../config/navigation';

type Props = {
  onClose: () => void;
};

const QUICK_ACTIONS = [
  { label: 'Tambah Penghuni Baru', icon: '➕', to: '/stays?action=new' },
  { label: 'Buat Tagihan', icon: '🧾', to: '/invoices?action=new' },
  { label: 'Buat Tiket Operasional', icon: '🎫', to: '/tickets?action=new' },
  { label: 'Lihat Laporan Bulan Ini', icon: '📊', to: '/reports' },
];

export default function CommandPalette({ onClose }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const overlayRef = useRef<HTMLDivElement>(null);

  const navLinks = (() => {
    if (user?.role === 'OWNER') {
      // Owner bekerja di dua konteks. Jangan hanya tampilkan menu operasional
      // (Area Admin), karena itu membuat Kokpit Owner tidak dapat dicari via Ctrl/Cmd+K.
      const seen = new Set<string>();
      return [...ownerSections, ...ownerAdminSections]
        .flatMap((section) => section.links)
        .filter((link) => {
          if (seen.has(link.to)) return false;
          seen.add(link.to);
          return true;
        });
    }
    return getNavigationLinks(user?.role);
  })();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function go(to: string) {
    navigate(to);
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      className="cmd-palette-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal
      aria-label="Command palette"
    >
      <div className="cmd-palette-dialog">
        <Command className="cmd-palette-root" label="Menu perintah">
          <Command.Input
            className="cmd-palette-input"
            placeholder="Cari menu atau aksi…"
            autoFocus
          />
          <Command.List className="cmd-palette-list">
            <Command.Empty className="cmd-palette-empty">Tidak ada hasil.</Command.Empty>

            <Command.Group heading="Navigasi" className="cmd-palette-group">
              {navLinks.map((link) => (
                <Command.Item
                  key={link.to}
                  value={`${link.label} ${link.hint ?? ''}`}
                  onSelect={() => go(link.to)}
                  className="cmd-palette-item"
                >
                  <span className="cmd-palette-item-icon" aria-hidden>{link.icon}</span>
                  <span>{link.label}</span>
                  {link.hint ? <span className="cmd-palette-item-hint">{link.hint}</span> : null}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Aksi Cepat" className="cmd-palette-group">
              {QUICK_ACTIONS.map((action) => (
                <Command.Item
                  key={action.to}
                  value={action.label}
                  onSelect={() => go(action.to)}
                  className="cmd-palette-item"
                >
                  <span className="cmd-palette-item-icon" aria-hidden>{action.icon}</span>
                  <span>{action.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
