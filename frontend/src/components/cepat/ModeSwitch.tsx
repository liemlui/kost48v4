import type { AppMode } from '../../utils/modeCepat';

type Props = {
  active: AppMode;
  onSelect: (mode: AppMode) => void;
  className?: string;
  label?: string;
};

/**
 * Saklar dua mode. Murni presentasional: pemanggil yang menyimpan preferensi
 * dan memutuskan navigasi. Tombol aktif tetap bisa ditekan (idempoten).
 */
export default function ModeSwitch({ active, onSelect, className, label = 'Pilih mode tampilan' }: Props) {
  return (
    <div className={`mode-switch${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
      <button
        type="button"
        className={active === 'cepat' ? 'active' : ''}
        aria-pressed={active === 'cepat'}
        onClick={() => onSelect('cepat')}
        title="Mode Cepat: kartu keputusan dan langkah berikutnya"
      >
        Cepat
      </button>
      <button
        type="button"
        className={active === 'normal' ? 'active' : ''}
        aria-pressed={active === 'normal'}
        onClick={() => onSelect('normal')}
        title="Mode Normal: seluruh menu, tabel, dan laporan"
      >
        Normal
      </button>
    </div>
  );
}
