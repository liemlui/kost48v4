export type DedupableCommandItem = {
  id: string | number;
  dedupKey?: string;
  ruleId?: string;
  entityType?: string;
  entityId?: string | number | null;
  actionTo?: string;
  actionRoute?: string;
};

export function getCommandDedupKey(item: DedupableCommandItem): string {
  if (item.dedupKey) return item.dedupKey;
  const route = item.actionRoute ?? item.actionTo ?? '';
  if (item.ruleId || item.entityType || item.entityId || route) {
    return [item.ruleId ?? item.id, item.entityType ?? 'item', item.entityId ?? item.id, route].join('|');
  }
  return String(item.id);
}

export function dedupeCommandItems<T extends DedupableCommandItem>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getCommandDedupKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function withoutOverlappingCommandItems<T extends DedupableCommandItem, U extends DedupableCommandItem>(items: T[], otherItems: U[]): T[] {
  const blocked = new Set(otherItems.map(getCommandDedupKey));
  return items.filter((item) => !blocked.has(getCommandDedupKey(item)));
}
