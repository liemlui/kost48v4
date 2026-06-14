import { useRef, type ChangeEventHandler } from 'react';
import { Button, Form } from 'react-bootstrap';

type Props = {
  onChange: ChangeEventHandler<HTMLInputElement>;
  accept?: string;
  disabled?: boolean;
  helpText?: string;
};

export default function CameraOrGalleryInput({
  onChange,
  accept = 'image/jpeg,image/png,image/webp',
  disabled = false,
  helpText = 'Ambil foto memakai kamera belakang atau pilih gambar yang sudah ada.',
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  return (
    <div className="camera-or-gallery-input">
      <input
        ref={cameraRef}
        className="visually-hidden"
        type="file"
        accept={accept}
        capture="environment"
        disabled={disabled}
        onChange={onChange}
      />
      <input
        ref={galleryRef}
        className="visually-hidden"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={onChange}
      />
      <div className="d-flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline-primary"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
        >
          Ambil Foto
        </Button>
        <Button
          type="button"
          variant="outline-secondary"
          disabled={disabled}
          onClick={() => galleryRef.current?.click()}
        >
          Pilih dari Galeri
        </Button>
      </div>
      <Form.Text muted>{helpText}</Form.Text>
    </div>
  );
}
