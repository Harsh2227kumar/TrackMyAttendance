/**
 * Date formatting utilities for the SIT ERP portal.
 * Standardizes date display across all portals and exports to DD-MM-YYYY (e.g., 16-09-2026).
 */

export function formatDateDMY(dateInput?: string | null | Date): string {
  if (!dateInput) return '';

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const d = String(dateInput.getDate()).padStart(2, '0');
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const y = dateInput.getFullYear();
    return `${d}-${m}-${y}`;
  }

  const str = String(dateInput).trim();
  if (!str) return '';

  // Already in DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // YYYY-MM-DD format (e.g. 2026-09-16 or 2026-09-16T12:00:00)
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d}-${m}-${y}`;
  }

  // Parse ISO or standard date string
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}-${m}-${y}`;
  }

  return str;
}
