import { useState, useCallback, useEffect } from 'react';
import { Modal } from 'react-bootstrap';

type ImageLightboxProps = {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Optional thumbnail trigger — defaults to showing the image itself */
  children?: React.ReactNode;
  /** Optional caption shown below full-size image */
  caption?: string;
};

/**
 * Reusable image lightbox — click to view full-size in a modal overlay.
 * Closes on Escape, backdrop click, or close button.
 * Supports pinch-zoom on mobile via native image rendering.
 */
export default function ImageLightbox({ src, alt, children, caption }: ImageLightboxProps) {
  const [show, setShow] = useState(false);

  const open = useCallback(() => setShow(true), []);
  const close = useCallback(() => setShow(false), []);

  // Close on Escape key
  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [show, close]);

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        className="image-lightbox-trigger"
        onClick={open}
        aria-label={`Buka ${alt} ukuran penuh`}
      >
        {children ?? (
          <img src={src} alt={alt} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, cursor: 'zoom-in' }} />
        )}
      </button>

      {/* Full-size modal */}
      <Modal show={show} onHide={close} centered size="xl" contentClassName="image-lightbox-modal">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">{alt}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-3">
          <img
            src={src}
            alt={alt}
            className="image-lightbox-full"
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
          {caption ? <p className="text-muted small mt-2 mb-0">{caption}</p> : null}
        </Modal.Body>
      </Modal>
    </>
  );
}
