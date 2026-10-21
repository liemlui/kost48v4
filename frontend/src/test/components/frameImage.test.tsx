import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import FrameImage from '../../components/common/FrameImage';

/** jsdom tidak mengunduh gambar; dimensi asli disuntikkan manual lalu `load` dipicu. */
function withNaturalSize(image: HTMLElement, width: number, height: number) {
  Object.defineProperty(image, 'naturalWidth', { configurable: true, value: width });
  Object.defineProperty(image, 'naturalHeight', { configurable: true, value: height });
}

describe('FrameImage — foto rasio ekstrem ditampilkan utuh', () => {
  it('4:3 dipotong rapi (cover) tanpa latar blur', () => {
    const { container } = render(<FrameImage src="/foto-4x3.jpg" alt="Foto kamar" className="gx-room-image" />);
    const image = screen.getByAltText('Foto kamar');
    withNaturalSize(image, 1600, 1200);
    fireEvent.load(image);

    expect(image.className).toContain('frame-image');
    expect(image.className).not.toContain('frame-image-contain');
    expect(container.querySelector('.frame-image-backdrop')).toBeNull();
  });

  it('potret ekstrem memakai contain + salinan blur yang dekoratif', () => {
    const { container } = render(<FrameImage src="/foto-potret.jpg" alt="Foto potret" className="rm-card-img" />);
    const image = screen.getByAltText('Foto potret');
    withNaturalSize(image, 1200, 2400);
    fireEvent.load(image);

    expect(image.className).toContain('frame-image-contain');
    const backdrop = container.querySelector('.frame-image-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop).toHaveAttribute('alt', '');
  });

  it('mode paksa contain berlaku tanpa menunggu gambar dimuat', () => {
    const { container } = render(<FrameImage src="/hero.jpg" alt="Hero" mode="contain" />);
    expect(screen.getByAltText('Hero').className).toContain('frame-image-contain');
    expect(container.querySelector('.frame-image-backdrop')).not.toBeNull();
  });

  it('foto berikutnya mengembalikan mode ke cover sampai rasionya terbaca', () => {
    const { container, rerender } = render(<FrameImage src="/potret.jpg" alt="Foto kamar" />);
    const first = screen.getByAltText('Foto kamar');
    withNaturalSize(first, 1200, 2400);
    fireEvent.load(first);
    expect(screen.getByAltText('Foto kamar').className).toContain('frame-image-contain');

    rerender(<FrameImage src="/mendatar.jpg" alt="Foto kamar" />);
    expect(screen.getByAltText('Foto kamar').className).not.toContain('frame-image-contain');
    expect(container.querySelector('.frame-image-backdrop')).toBeNull();
  });

  it('kegagalan muat diteruskan ke pemanggil', () => {
    const onError = vi.fn();
    render(<FrameImage src="/rusak.jpg" alt="Foto rusak" onError={onError} />);
    fireEvent.error(screen.getByAltText('Foto rusak'));
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
