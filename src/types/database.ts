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
  created_at?: string;
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
