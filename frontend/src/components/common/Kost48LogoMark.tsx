import { useState } from 'react';

type Kost48LogoMarkSize = 'default' | 'small' | 'tiny' | 'login';

type Kost48LogoMarkProps = {
  size?: Kost48LogoMarkSize;
  className?: string;
  label?: string;
};

export default function Kost48LogoMark({ size = 'default', className = '', label = 'Logo KOST48' }: Kost48LogoMarkProps) {
  const [failed, setFailed] = useState(false);
  const sizeClass = size === 'default' ? '' : size;
  const classes = ['brand-mark', 'kost48-logo-mark', sizeClass, className].filter(Boolean).join(' ');

  return (
    <span className={classes} role="img" aria-label={label}>
      {!failed ? (
        <img
          src="/room-images/logo-kost48-sby.webp"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="kost48-logo-fallback" aria-hidden="true">K48</span>
      )}
    </span>
  );
}
