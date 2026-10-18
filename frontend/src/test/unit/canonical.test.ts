import { beforeEach, describe, expect, it } from 'vitest';
import { applyCanonicalUrl, canonicalUrlForPath } from '../../utils/canonical';

describe('canonicalUrlForPath', () => {
  it('memakai domain utama, bukan host app.', () => {
    expect(canonicalUrlForPath('/')).toBe('https://kost48surabaya.com/');
    expect(canonicalUrlForPath('/rooms')).toBe('https://kost48surabaya.com/rooms');
    expect(canonicalUrlForPath('reviews')).toBe('https://kost48surabaya.com/reviews');
  });

  it('membuang query, hash, dan garis miring akhir', () => {
    expect(canonicalUrlForPath('/rooms?page=2#top')).toBe('https://kost48surabaya.com/rooms');
    expect(canonicalUrlForPath('/rooms///')).toBe('https://kost48surabaya.com/rooms');
  });
});

describe('applyCanonicalUrl', () => {
  beforeEach(() => {
    document.querySelectorAll('link[rel="canonical"]').forEach((el) => el.remove());
  });

  it('membuat link canonical bila belum ada', () => {
    applyCanonicalUrl('/panduan');

    const links = document.querySelectorAll('link[rel="canonical"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://kost48surabaya.com/panduan');
  });

  it('menimpa canonical lama ke domain utama tanpa membuat link ganda', () => {
    const existing = document.createElement('link');
    existing.setAttribute('rel', 'canonical');
    existing.setAttribute('href', 'https://domain-lama.invalid/');
    document.head.appendChild(existing);

    applyCanonicalUrl('/reviews');

    const links = document.querySelectorAll('link[rel="canonical"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://kost48surabaya.com/reviews');
  });
});
