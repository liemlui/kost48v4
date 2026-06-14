import { Button, Spinner } from 'react-bootstrap';
import { useAuthenticatedMediaUrl } from '../../hooks/useAuthenticatedMediaUrl';

type Props = {
  src?: string | null;
  label?: string;
  fileName?: string;
  download?: boolean;
  size?: 'sm' | 'lg';
  variant?: string;
  className?: string;
};

export default function AuthenticatedFileLink({
  src,
  label = 'Buka File',
  fileName,
  download = false,
  size = 'sm',
  variant = 'outline-secondary',
  className,
}: Props) {
  const media = useAuthenticatedMediaUrl(src);

  if (!src) return null;
  if (media.failed) return <span className="small text-danger">File tidak dapat dibuka</span>;

  if (media.loading || !media.url) {
    return (
      <Button size={size} variant={variant} className={className} disabled>
        <Spinner animation="border" size="sm" className="me-2" />
        Memuat
      </Button>
    );
  }

  return (
    <Button
      as="a"
      href={media.url}
      download={download ? (fileName || true) : undefined}
      target="_blank"
      rel="noreferrer"
      size={size}
      variant={variant}
      className={className}
    >
      {label}
    </Button>
  );
}
