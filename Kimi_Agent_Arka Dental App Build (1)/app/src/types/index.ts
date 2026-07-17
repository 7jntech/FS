export interface Transaction {
  id: string;
  dmdName: string;        // doctor full name
  apptDate: string;       // ISO yyyy-mm-dd (displayed mm/dd/yyyy)
  patientName: string;
  procedureType: string;
  grossBill: number;
  discountType: string;   // '' = none
  amountPaid: number;
  dentistCommPct: number; // 10 | 20 | 30 | 40
  paymentMode: string;
  netIncomeAfterComm: number; // hidden column
  merchantFee: number;
  netSales: number;
  remarks: string;
}

export interface ExpenseRecord {
  id: string;
  month: string; // yyyy-mm
  category: string;
  label: string;
  amount: number;
  note: string;
}

export interface Employee {
  id: string;
  kind: 'staff' | 'doctor';
  name: string;
  staffCode?: string;   // e.g. MM, RA, RB, MK, AN
  tin: string;
  contact: string;
  emergencyContact: string;
  email: string;
  dob: string;
  address: string;
  hiredDate: string;
  schedule: string;
  dailyRate: number;      // staff only
  doctorCode?: string;    // doctor only
  applyDeductions?: boolean; // staff: include gov't deductions on payslip
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // ISO
  status: 'At-Work' | 'Absent' | 'VL' | 'SL';
  holidayRule: '' | '130%' | '200%' | 'No work no pay' | 'PH-HL Paid leave';
  otHours?: number;
}

/** Per-employee, per-week payroll inputs (late hours, exemptions, half days, deductions, incentive). */
export interface WeeklyEntry {
  lateHours: number;
  exempt: boolean[]; // up to 3 late-hour exemptions
  halfDays: number;
  pagibig: number | null;      // null = use default
  philhealth: number | null;
  sss: number | null;
  perfIncentive: number;
}

export interface Incentives {
  goodJob: number;
  attendance: number;
}

/** Manual tax entries per month (free text amounts). */
export interface TaxEntries {
  birTax: string;
  withholdingTax: string;
  itr: string;
}

export interface PayrollSettings {
  deductionSplit: 'split' | 'full'; // split monthly deduction across weekly payrolls, or full on first
  doctorCutoffDay1: number;  // first cutoff day (default 15)
  doctorDisbursementDate: string; // ISO
  locked: boolean;
}

export interface AppState {
  transactions: Transaction[];
  expenses: ExpenseRecord[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  incentives: Record<string, Incentives>; // legacy, unused
  weekly: Record<string, WeeklyEntry>;    // key: `${employeeId}|${month}|${weekKey}`
  doctors: { code: string; name: string }[];
  procedures: { name: string; price: number }[];
  payroll: PayrollSettings;
  taxes: Record<string, TaxEntries>; // key: month yyyy-mm
}
