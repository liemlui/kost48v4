export type ActionLike = {
  actionTo?: string;
  actionLabel?: string;
  onAction?: unknown;
};

function actionKey(item: ActionLike) {
  if (item.actionTo) return `to:${item.actionTo}`;
  if (item.onAction && item.actionLabel) return `handler:${item.actionLabel}`;
  return '';
}

export function limitRepeatedActions<T extends ActionLike>(items: T[], maxActions = 2): T[] {
  let actionCount = 0;
  const seen = new Set<string>();

  return items.map((item) => {
    const key = actionKey(item);
    if (!key) return item;

    const isDuplicate = seen.has(key);
    if (!isDuplicate) seen.add(key);

    if (actionCount >= maxActions || isDuplicate) {
      return { ...item, actionLabel: undefined, actionTo: undefined, onAction: undefined } as T;
    }

    actionCount += 1;
    return item;
  });
}

export function firstUsefulActions<T>(items: T[], maxActions = 2): T[] {
  return items.filter(Boolean).slice(0, maxActions);
}
