
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // If it's already a full ISO string, just return new Date
  if (dateStr.includes('T')) return new Date(dateStr);
  
  // Split YYYY-MM-DD and create a date in local time
  const [year, month, day] = dateStr.split('-').map(Number);
  // Note: month is 0-indexed in new Date(y, m, d)
  return new Date(year, month - 1, day);
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  // Expected format: YYYY-MM-DD
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export function formatDateObject(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getYearMonth(dateStr: string): { year: number, month: number } {
  if (!dateStr) return { year: 0, month: 0 };
  const parts = dateStr.split('T')[0].split('-');
  return {
    year: parseInt(parts[0]),
    month: parseInt(parts[1]) - 1 // 0-indexed to match JS Date
  };
}

export function formatCurrency(value: number): string {
  return (value || 0).toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}
