import * as XLSX from 'xlsx';
import type { Employee, TimeOffWithEmployee } from '../types/database';
import { getTodayDateString } from './date';

/**
 * Converte uma string no formato "HH:MM" (inclusive negativa como "-03:45" ou >24h como "45:20")
 * para o total correspondente em minutos inteiros.
 */
export function hhmmToMinutes(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === '') return 0;

  if (typeof input === 'number') {
    if (Number.isNaN(input)) return 0;
    return Math.round(input * 60);
  }

  const raw = String(input).trim();
  if (!raw) return 0;

  // Verifica sinal negativo ou positivo no início
  const isNegative = raw.startsWith('-');
  const clean = raw.replace(/^[+-]\s*/, '').trim();

  // Formato HH:MM ou HH:MM:SS
  const colonMatch = clean.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    const seconds = colonMatch[3] ? parseInt(colonMatch[3], 10) : 0;
    const total = hours * 60 + minutes + Math.round(seconds / 60);
    return isNegative ? -total : total;
  }

  // Formato decimal (ex: "14,5" ou "14.5")
  const normalizedNum = Number(clean.replace(',', '.'));
  if (!Number.isNaN(normalizedNum)) {
    const total = Math.round(normalizedNum * 60);
    return isNegative ? -total : total;
  }

  return 0;
}

/**
 * Valida se uma string está num formato HH:MM válido (ex: "20:00", "-02:30", "125:15")
 */
export function isValidHHMM(input: string): boolean {
  const trimmed = input.trim();
  return /^[+-]?\d{1,4}:[0-5]\d$/.test(trimmed);
}

/**
 * Converte um total de minutos inteiros para a representação "HH:MM"
 * Ex: 1200 -> "20:00", -150 -> "-02:30", 1935 -> "32:15", 0 -> "00:00"
 */
export function minutesToHHMM(totalMinutes: number | null | undefined, showPlusSign = false): string {
  if (totalMinutes === null || totalMinutes === undefined || Number.isNaN(totalMinutes)) {
    return '00:00';
  }

  const rounded = Math.round(totalMinutes);
  const isNegative = rounded < 0;
  const absMinutes = Math.abs(rounded);

  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;

  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  if (isNegative) return `-${formatted}`;
  if (showPlusSign && rounded > 0) return `+${formatted}`;
  return formatted;
}

/**
 * Converte uma célula do Excel (SheetJS) para minutos, tratando:
 * 1. Strings formatadas como "HH:MM" / "-HH:MM" / "HH:MM:SS"
 * 2. Valores numéricos de tempo do Excel (onde 1.0 = 24h = 1440 minutos, preservando >24h)
 */
export function parseExcelCellToMinutes(cell: XLSX.CellObject | undefined): {
  minutes: number;
  formattedHHMM: string;
  rawDisplay: string;
  isValid: boolean;
} {
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') {
    return { minutes: 0, formattedHHMM: '00:00', rawDisplay: '', isValid: false };
  }

  // Caso 1: Célula do tipo numérico no Excel
  if (cell.t === 'n' && typeof cell.v === 'number') {
    const formattedText = (cell.w || '').trim();
    const formatCode = (cell.z ? String(cell.z) : '').toLowerCase();

    // Se a formatação da célula contém ':' ou 'h' ou 'm', o número é um serial de tempo do Excel (1 dia = 1440 min)
    const isExcelTimeSerial =
      formattedText.includes(':') ||
      formatCode.includes('h') ||
      formatCode.includes('m') ||
      (Math.abs(cell.v) > 0 && Math.abs(cell.v) < 10 && !Number.isInteger(cell.v));

    if (isExcelTimeSerial) {
      const totalMins = Math.round(cell.v * 1440);
      return {
        minutes: totalMins,
        formattedHHMM: minutesToHHMM(totalMins),
        rawDisplay: formattedText || minutesToHHMM(totalMins),
        isValid: true,
      };
    }

    // Caso o usuário tenha digitado um número inteiro/decimal puro de horas (ex: 20 -> 20:00)
    const totalMins = Math.round(cell.v * 60);
    return {
      minutes: totalMins,
      formattedHHMM: minutesToHHMM(totalMins),
      rawDisplay: String(cell.v),
      isValid: true,
    };
  }

  // Caso 2: Célula de texto (String)
  const strVal = String(cell.w ?? cell.v).trim();
  if (!strVal) {
    return { minutes: 0, formattedHHMM: '00:00', rawDisplay: '', isValid: false };
  }

  // Verifica se é um texto HH:MM ou HH:MM:SS (com ou sem sinal)
  const cleanForMatch = strVal.replace(/^[+-]\s*/, '').replace(/h$/i, '');
  if (/^\d+:\d{1,2}(:\d{1,2})?$/.test(cleanForMatch)) {
    const mins = hhmmToMinutes(strVal.replace(/h$/i, ''));
    return {
      minutes: mins,
      formattedHHMM: minutesToHHMM(mins),
      rawDisplay: strVal,
      isValid: true,
    };
  }

  // Verifica se é número em texto
  const numCandidate = Number(strVal.replace(',', '.'));
  if (!Number.isNaN(numCandidate)) {
    const mins = Math.round(numCandidate * 60);
    return {
      minutes: mins,
      formattedHHMM: minutesToHHMM(mins),
      rawDisplay: strVal,
      isValid: true,
    };
  }

  return { minutes: 0, formattedHHMM: '00:00', rawDisplay: strVal, isValid: false };
}

export interface ParsedSpreadsheetRow {
  rowNumber: number;
  rawName: string;
  rawBalance: string;
  minutes: number;
  formattedHHMM: string;
  matchedEmployee: Employee | null;
}

/**
 * Normaliza nome para comparação case-insensitive e sem acentos extras/espaços duplicados
 */
export function normalizeNameForMatch(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lê um arquivo .xlsx ou .csv (ArrayBuffer) usando SheetJS, extraindo:
 * - Coluna A: NOME do colaborador
 * - Coluna B: Saldo de horas (HH:MM)
 * E vinculando (match case-insensitive/trim) com os colaboradores cadastrados.
 */
export function parseBalanceSpreadsheet(
  buffer: ArrayBuffer,
  employees: Employee[]
): ParsedSpreadsheetRow[] {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: false,
    raw: false,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet || !worksheet['!ref']) return [];

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const results: ParsedSpreadsheetRow[] = [];

  // Mapa para busca rápida de colaboradores por nome normalizado
  const employeeMap = new Map<string, Employee>();
  employees.forEach((emp) => {
    employeeMap.set(normalizeNameForMatch(emp.name), emp);
  });

  for (let rowIdx = range.s.r; rowIdx <= range.e.r; rowIdx++) {
    const cellAAddress = XLSX.utils.encode_cell({ r: rowIdx, c: 0 });
    const cellBAddress = XLSX.utils.encode_cell({ r: rowIdx, c: 1 });

    const cellA = worksheet[cellAAddress];
    const cellB = worksheet[cellBAddress];

    const rawName = cellA ? String(cellA.w ?? cellA.v ?? '').trim() : '';
    if (!rawName) continue;

    // Ignora linha de cabeçalho se a Coluna A for "NOME", "COLABORADOR", "FUNCIONARIO" etc.
    const normalizedA = normalizeNameForMatch(rawName);
    const parsedB = parseExcelCellToMinutes(cellB);

    if (
      rowIdx === range.s.r &&
      !parsedB.isValid &&
      ['nome', 'colaborador', 'funcionario', 'empregado', 'analista'].some((h) =>
        normalizedA.includes(h)
      )
    ) {
      continue;
    }

    // Busca match exato normalizado
    let matchedEmployee = employeeMap.get(normalizedA) || null;

    // Fallback: se não achou match exato, verifica se algum colaborador contém o nome ou vice-versa (apenas se único)
    if (!matchedEmployee) {
      const partialMatches = employees.filter((emp) => {
        const normEmp = normalizeNameForMatch(emp.name);
        return normEmp === normalizedA;
      });
      if (partialMatches.length === 1) {
        matchedEmployee = partialMatches[0];
      }
    }

    results.push({
      rowNumber: rowIdx + 1,
      rawName,
      rawBalance: parsedB.rawDisplay,
      minutes: parsedB.minutes,
      formattedHHMM: parsedB.formattedHHMM,
      matchedEmployee,
    });
  }

  return results;
}

export interface EmployeeBalanceSummary {
  employee: Employee;
  hasBaseBalance: boolean;
  baseMinutes: number;
  baseHHMM: string;
  baseDate: string | null;
  deductedMinutesAfterBase: number;
  deductedHHMM: string;
  deductedCountAfterBase: number;
  currentBalanceMinutes: number;
  currentBalanceHHMM: string;
}

/**
 * Calcula dinamicamente o "Saldo Hoje" de um colaborador segundo a Regra de Negócio Crítica:
 * - 1 dia de folga integral (is_full_day = true) equivale a 08:00 (480 minutos).
 * - Folgas parciais abatem hours * 60 minutos.
 * - Regra de Corte Temporal:
 *   Apenas folgas com data ESTRITAMENTE APÓS a `data_base_saldo` (date > data_base_saldo)
 *   e até a data de hoje (date <= today) são descontadas.
 *   Folgas com data <= data_base_saldo NÃO são descontadas.
 */
export function calculateEmployeeBalance(
  employee: Employee,
  timeOffs: TimeOffWithEmployee[],
  todayOverride?: string
): EmployeeBalanceSummary {
  const todayStr = todayOverride || getTodayDateString();

  // Obtém saldo base em minutos (prioriza saldo_base_minutos, fallback para saldo_base_horas)
  const hasBaseBalance =
    (employee.saldo_base_minutos !== null && employee.saldo_base_minutos !== undefined) ||
    Boolean(employee.saldo_base_horas) ||
    Boolean(employee.data_base_saldo);

  const baseMinutes =
    employee.saldo_base_minutos !== null && employee.saldo_base_minutos !== undefined
      ? Number(employee.saldo_base_minutos)
      : employee.saldo_base_horas
        ? hhmmToMinutes(employee.saldo_base_horas)
        : 0;

  const baseDate = employee.data_base_saldo || null;

  // Filtra folgas do colaborador que ocorreram estritamente após a data-base até hoje
  const qualifyingTimeOffs = (timeOffs || []).filter((to) => {
    if (to.employee_id !== employee.id) return false;
    if (!to.date) return false;

    // Deve ser até a data de hoje
    if (to.date > todayStr) return false;

    // Se houver data_base_saldo definida, deve ser ESTRITAMENTE APÓS (to.date > baseDate)
    if (baseDate) {
      return to.date > baseDate;
    }

    // Se não houver data_base_saldo, considera as folgas até hoje
    return true;
  });

  const deductedMinutesAfterBase = qualifyingTimeOffs.reduce((acc, to) => {
    if (to.is_full_day) {
      return acc + 480; // 08:00 (480 minutos)
    }
    const partialMinutes = Math.round((Number(to.hours) || 0) * 60);
    return acc + partialMinutes;
  }, 0);

  const currentBalanceMinutes = baseMinutes - deductedMinutesAfterBase;

  return {
    employee,
    hasBaseBalance,
    baseMinutes,
    baseHHMM: minutesToHHMM(baseMinutes),
    baseDate,
    deductedMinutesAfterBase,
    deductedHHMM:
      deductedMinutesAfterBase > 0 ? `-${minutesToHHMM(deductedMinutesAfterBase)}` : '00:00',
    deductedCountAfterBase: qualifyingTimeOffs.length,
    currentBalanceMinutes,
    currentBalanceHHMM: minutesToHHMM(currentBalanceMinutes),
  };
}
