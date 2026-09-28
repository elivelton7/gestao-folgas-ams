/**
 * Utilitários de manipulação e formatação de datas.
 * Previne problemas comuns de timezone com datas no formato YYYY-MM-DD.
 */

export function formatDateBR(dateString: string): string {
  if (!dateString) return '';
  
  // Dividir diretamente a string YYYY-MM-DD evita a conversão indevida de fuso horário UTC -> UTC-3
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;

  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isUpcoming(dateString: string): boolean {
  const today = getTodayDateString();
  return dateString >= today;
}

export function getDaysAgoDateString(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStartOfYearDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

export type PastDateFilter = '30d' | '90d' | 'year' | 'all';

export function isWithinPastFilter(dateString: string, filter: PastDateFilter): boolean {
  const today = getTodayDateString();
  if (dateString >= today) return false;

  switch (filter) {
    case '30d':
      return dateString >= getDaysAgoDateString(30);
    case '90d':
      return dateString >= getDaysAgoDateString(90);
    case 'year':
      return dateString >= getStartOfYearDateString();
    case 'all':
    default:
      return true;
  }
}
