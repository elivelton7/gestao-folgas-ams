export interface Team {
  id: string;
  name: string;
  created_at?: string;
}

export interface Employee {
  id: string;
  name: string;
  team_id?: string | null;
  teams?: Team | null;
  saldo_base_minutos?: number | null;
  saldo_base_horas?: string | null;
  data_base_saldo?: string | null; // YYYY-MM-DD
  updated_at?: string | null;
  created_at?: string;
}

export interface UpdateEmployeePayload {
  id: string;
  name?: string;
  team_id?: string | null;
  saldo_base_minutos?: number | null;
  saldo_base_horas?: string | null;
  data_base_saldo?: string | null;
}

export interface MergeEmployeesPayload {
  targetEmployeeId: string;
  sourceEmployeeId: string;
  finalName: string;
  finalTeamId: string | null;
  finalSaldoBaseMinutos: number | null;
  finalSaldoBaseHoras: string | null;
  finalDataBaseSaldo: string | null;
}

export interface TimeOff {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  description: string | null;
  is_full_day: boolean;
  hours: number | null;
  created_at?: string;
}

export interface TimeOffWithEmployee extends TimeOff {
  employees: Employee;
}

export interface CreateTimeOffPayload {
  employee_id: string;
  date: string;
  description: string;
  is_full_day: boolean;
  hours: number | null;
}

export interface CreateEmployeePayload {
  name: string;
  team_id?: string | null;
}

export interface CreateTeamPayload {
  name: string;
}

export type ReportFrequency = 'REALTIME' | 'DAILY' | 'WEEKLY';

export interface ReportRecipient {
  id: string;
  name: string | null;
  email: string;
  frequency: ReportFrequency;
  is_active: boolean;
  created_at?: string;
}

export interface CreateReportRecipientPayload {
  name?: string;
  email: string;
  frequency: ReportFrequency;
}

export interface Vacation {
  id: string;
  employee_id: string;
  start_date: string; // YYYY-MM-DD
  return_date: string; // YYYY-MM-DD
  days: number;
  notes: string | null;
  created_at?: string;
}

export interface VacationWithEmployee extends Vacation {
  employees: Employee;
}

export interface CreateVacationPayload {
  employee_id: string;
  start_date: string;
  return_date: string;
  days: number;
  notes?: string | null;
}

