function cleanLabel(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

const WIDE_TABLE_CLASSES = [
  'staff-print-table',
  'invoice-print-table',
  'print-table',
  'room-market-compare-table',
  'compare-table',
  'keep-wide-table',
];

function shouldKeepWide(table: HTMLTableElement) {
  if (table.dataset.keepWide === 'true') return true;
  if (table.closest('[data-keep-wide="true"], .keep-wide-table-zone')) return true;
  return WIDE_TABLE_CLASSES.some((className) => table.classList.contains(className));
}

function getHeaderLabels(table: HTMLTableElement) {
  const headerRow = table.querySelector('thead tr');
  if (!headerRow) return [];

  const labels: string[] = [];
  Array.from(headerRow.children).forEach((cell) => {
    if (!(cell instanceof HTMLTableCellElement)) return;
    const label = cleanLabel(cell.textContent) || 'Detail';
    const span = Math.max(1, cell.colSpan || 1);
    for (let index = 0; index < span; index += 1) labels.push(label);
  });
  return labels;
}

function enhanceTable(table: HTMLTableElement) {
  if (!table.tBodies.length) return;

  if (shouldKeepWide(table)) {
    table.classList.add('keep-wide-table');
    table.classList.remove('responsive-data-table');
    table.dataset.responsiveEnhanced = 'wide';
    return;
  }

  const headers = getHeaderLabels(table);
  if (!headers.length) return;

  table.classList.add('responsive-data-table');
  table.dataset.responsiveEnhanced = 'true';

  const wrapper = table.closest('.table-responsive');
  if (wrapper instanceof HTMLElement) wrapper.classList.add('responsive-table-wrapper');

  Array.from(table.querySelectorAll('tbody tr')).forEach((row) => {
    const cells = Array.from(row.children).filter((cell) => cell instanceof HTMLTableCellElement) as HTMLTableCellElement[];
    let headerIndex = 0;

    cells.forEach((cell) => {
      const existingLabel = cleanLabel(cell.getAttribute('data-label'));
      const fallback = headers[headerIndex] || existingLabel || 'Detail';
      cell.setAttribute('data-label', existingLabel || fallback);
      headerIndex += Math.max(1, cell.colSpan || 1);
    });
  });
}

function enhanceAllTables() {
  document.querySelectorAll<HTMLTableElement>('table').forEach(enhanceTable);
}

export function installResponsiveTableLabels() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const marker = '__kost48ResponsiveTablesInstalled';
  const globalWindow = window as unknown as Record<string, boolean>;
  if (globalWindow[marker]) {
    enhanceAllTables();
    return;
  }
  globalWindow[marker] = true;

  let scheduled = false;
  const run = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceAllTables();
    });
  };

  run();

  const root = document.getElementById('root') ?? document.body;
  const observer = new MutationObserver(() => run());
  observer.observe(root, { childList: true, subtree: true });
}
