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

/**
 * Calcula a data de retorno (retorno ao trabalho):
 * - A duração das férias é somada em dias corridos (incluindo sábados e domingos).
 * - A volta não pode acontecer no sábado nem domingo; caso a data caia em fim de semana,
 *   a data de volta é automaticamente projetada para a segunda-feira seguinte.
 */
export function calculateReturnDate(startDateString: string, daysCount: number): string {
  if (!startDateString || daysCount <= 0) return startDateString;

  const [year, month, day] = startDateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // Soma a quantidade de dias corridos de férias
  date.setDate(date.getDate() + Number(daysCount));

  // Se cair no sábado (dia 6), volta na segunda-feira (+2 dias)
  if (date.getDay() === 6) {
    date.setDate(date.getDate() + 2);
  } 
  // Se cair no domingo (dia 0), volta na segunda-feira (+1 dia)
  else if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }

  const resYear = date.getFullYear();
  const resMonth = String(date.getMonth() + 1).padStart(2, '0');
  const resDay = String(date.getDate()).padStart(2, '0');
  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Férias em curso: já iniciaram na data de hoje ou antes, e o colaborador ainda não retornou (hoje < data de volta).
 */
export function isVacationCurrent(startDateString: string, returnDateString: string): boolean {
  const today = getTodayDateString();
  return startDateString <= today && today < returnDateString;
}

/**
 * Férias futuras / próximas: a data de início ainda não chegou (start_date > hoje).
 */
export function isVacationUpcoming(startDateString: string): boolean {
  const today = getTodayDateString();
  return startDateString > today;
}

/**
 * Férias passadas: o colaborador já retornou ao trabalho (return_date <= hoje).
 */
export function isVacationPast(returnDateString: string): boolean {
  const today = getTodayDateString();
  return returnDateString <= today;
}

