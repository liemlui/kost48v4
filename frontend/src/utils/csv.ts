/**
 * M10-D: Frontend-only CSV utility.
 * Zero dependencies — pure browser APIs (Blob, URL.createObjectURL).
 */

function escapeCsvField(field: string): string {
  if (
    field.includes(',') ||
    field.includes('"') ||
    field.includes('\n') ||
    field.includes('\r')
  ) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Convert array of string arrays into a CSV string.
 * Each inner array is one row.
 */
export function generateCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}

/**
 * Trigger browser download of a CSV string as a .csv file.
 * Adds BOM (\uFEFF) so Excel opens UTF-8 correctly.
 */
export function downloadCsv(content: string, filename: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}