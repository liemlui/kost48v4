import { describe, expect, it } from 'vitest';
import { HOME_FAQ_ITEMS } from '../../pages/public/publicGuestShared';

describe('FAQ kapasitas kamar', () => {
  it('menyebut kapasitas STANDARD 2+2 dan LARGE 4+2 sesuai keputusan owner', () => {
    const item = HOME_FAQ_ITEMS.find((faq) => faq.question === 'Satu kamar untuk berapa orang?');
    expect(item).toBeTruthy();

    const answer = item?.answer ?? '';
    expect(answer).toContain('STANDARD 2+2');
    expect(answer).toContain('LARGE 4+2');
    expect(answer).not.toMatch(/maksimal 4 orang/i);
  });
});
