export const INDONESIAN_READABILITY_RULE = {
  titleMaxWords: 7,
  bodyMaxLines: 2,
  maxPrimaryActionsPerPage: 2,
  note: 'KOST48 UI harus ringkas karena pengguna Indonesia cenderung skip teks panjang.',
} as const;

export function compactText(value: unknown, maxLength = 112) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;

  const sentences = text.match(/[^.!?]+[.!?]?/g)?.map((item) => item.trim()).filter(Boolean) ?? [text];
  const firstTwo = sentences.slice(0, 2).join(' ');
  const candidate = firstTwo.length <= maxLength ? firstTwo : text;
  return `${candidate.slice(0, Math.max(32, maxLength - 1)).trimEnd()}…`;
}

export function compactTitle(value: unknown, maxWords = INDONESIAN_READABILITY_RULE.titleMaxWords) {
  const words = String(value ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}
