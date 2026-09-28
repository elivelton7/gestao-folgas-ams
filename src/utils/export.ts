import type { TimeOffWithEmployee } from '../types/database';
import { formatDateBR } from './date';

/**
 * Copia os dados da tabela em formato TSV (Tab-Separated Values)
 * para a área de transferência. Ao colar no Excel (Ctrl + V), 
 * os dados se encaixam automaticamente em linhas e colunas perfeitas.
 */
export async function copyTableToClipboard(data: TimeOffWithEmployee[]): Promise<boolean> {
  if (!data || data.length === 0) return false;

  const headers = ['Colaborador', 'Time', 'Data', 'Tipo', 'Descrição'];

  const rows = data.map((item) => {
    const colab = item.employees?.name || 'Não identificado';
    const time = item.employees?.teams?.name || 'Geral';
    const dataFmt = formatDateBR(item.date);
    const tipo = item.is_full_day ? 'Dia Inteiro' : `${item.hours}h`;
    const desc = item.description || '';

    return [colab, time, dataFmt, tipo, desc].join('\t');
  });

  const tsvContent = [headers.join('\t'), ...rows].join('\n');

  try {
    await navigator.clipboard.writeText(tsvContent);
    return true;
  } catch (err) {
    console.error('Falha ao copiar para o clipboard:', err);
    return false;
  }
}

/**
 * Exporta os dados para um arquivo CSV formatado para o Excel brasileiro
 * (delimitador ';' e codificação UTF-8 com BOM para não quebrar acentos).
 */
export function exportTableToExcel(data: TimeOffWithEmployee[], filenamePrefix: string = 'folgas'): void {
  if (!data || data.length === 0) return;

  const headers = ['Colaborador', 'Time', 'Data', 'Tipo', 'Descrição'];

  const rows = data.map((item) => {
    const colab = `"${(item.employees?.name || 'Não identificado').replace(/"/g, '""')}"`;
    const time = `"${(item.employees?.teams?.name || 'Geral').replace(/"/g, '""')}"`;
    const dataFmt = formatDateBR(item.date);
    const tipo = item.is_full_day ? 'Dia Inteiro' : `${item.hours} horas`;
    const desc = `"${(item.description || '').replace(/"/g, '""')}"`;

    return [colab, time, dataFmt, tipo, desc].join(';');
  });

  // \uFEFF é o Byte Order Mark (BOM) para o Excel reconhecer acentuação UTF-8 automaticamente
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
