import type { AppState, AttendanceRecord, Employee, Transaction, WeeklyEntry } from '@/types';
import { DEFAULT_PAGIBIG_WK, DEFAULT_SSS_WK, MERCHANT_FEE_RATES, PH_HOLIDAYS_2026 } from './constants';

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Recompute derived columns of a transaction row. */
export function computeTransaction(t: Transaction): Transaction {
  const commission = r2(t.amountPaid * (t.dentistCommPct / 100));
  const netIncomeAfterComm = r2(t.amountPaid - commission);
  const mdr = MERCHANT_FEE_RATES[t.paymentMode] ?? 0;
  const merchantFee = r2(t.amountPaid * mdr);
  const netSales = r2(netIncomeAfterComm - merchantFee);
  return { ...t, netIncomeAfterComm, merchantFee, netSales };
}

/** Default amount paid given gross bill and discount type. */
export function defaultAmountPaid(gross: number, discountType: string): number {
  if (discountType.startsWith('Senior Citizen') || discountType.startsWith('PWD')) {
    return r2(gross * 0.8);
  }
  return gross;
}

/** Commission earned by a doctor from a transaction = amountPaid * pct. */
export const commissionOf = (t: Transaction) => r2(t.amountPaid * (t.dentistCommPct / 100));

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Display date as mm/dd/yyyy per spec. */
export const fmtDate = (s: string) => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${m}/${d}/${y}`;
};

export const monthKey = (s: string) => s.slice(0, 7);

export const holidayFor = (dateISO: string) => PH_HOLIDAYS_2026[dateISO.slice(5)] ?? null;

/* ---------- Calendar-month weeks: W1 1–7, W2 8–14, W3 15–21, W4 22–end ---------- */

export interface WeekDef {
  key: string; // W1..W4
  label: string;
  dates: string[]; // ISO dates in range
}

export function monthWeeks(month: string): WeekDef[] {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const mk = (day: number) => `${month}-${String(day).padStart(2, '0')}`;
  const ranges: [number, number, string, string][] = [
    [1, 7, 'W1', 'Week 1 (1st to 7th)'],
    [8, 14, 'W2', 'Week 2 (8th to 14th)'],
    [15, 21, 'W3', 'Week 3 (15th to 21st)'],
    [22, last, 'W4', `Week 4 (22nd to ${last})`],
  ];
  return ranges.map(([a, b, key, label]) => ({
    key,
    label,
    dates: Array.from({ length: b - a + 1 }, (_, i) => mk(a + i)),
  }));
}

/** Salary day: last day of the week range, moved earlier if it lands on Sunday / a non-working holiday. */
export function salaryDayFor(week: WeekDef): string {
  const d = parseISO(week.dates[week.dates.length - 1]);
  while (d.getDay() === 0 || holidayFor(iso(d))) d.setDate(d.getDate() - 1);
  return iso(d);
}

/* ---------- Weekly staff payroll ---------- */

export const hourlyRateOf = (dailyRate: number) => r2(dailyRate / 8);
export const defaultPhilHealthWk = (dailyRate: number) => r2((dailyRate * 26 * 0.05) / 2 / 4);

export interface WeekDayDetail {
  date: string;
  weekday: string;
  isSunday: boolean;
  holidayName: string | null;
  present: boolean;
  holidayRule: AttendanceRecord['holidayRule'] | '';
  pay: number;
  ot: number;
}

export interface WeeklyPay {
  employee: Employee;
  days: WeekDayDetail[];
  daysPresent: number;
  totalOT: number;
  lateHours: number;
  exemptCount: number;
  netLate: number;
  halfDays: number;
  hourlyRate: number;
  basicPay: number;
  otPay: number;
  lateDeduction: number;
  gross: number;
  pagibig: number;
  philhealth: number;
  sss: number;
  perfIncentive: number;
  totalDeductions: number;
  net: number;
}

export const weeklyKey = (empId: string, month: string, weekKey: string) =>
  `${empId}|${month}|${weekKey}`;

export function weeklyEntryOf(state: AppState, empId: string, month: string, weekKey: string): WeeklyEntry {
  return (
    state.weekly[weeklyKey(empId, month, weekKey)] ?? {
      lateHours: 0,
      exempt: [false, false, false],
      halfDays: 0,
      pagibig: null,
      philhealth: null,
      sss: null,
      perfIncentive: 0,
    }
  );
}

export function computeWeeklyPay(
  state: AppState,
  employee: Employee,
  month: string,
  week: WeekDef,
): WeeklyPay {
  const rate = employee.dailyRate;
  const hourly = hourlyRateOf(rate);
  const entry = weeklyEntryOf(state, employee.id, month, week.key);

  const days: WeekDayDetail[] = week.dates.map((d) => {
    const dt = parseISO(d);
    const rec = state.attendance.find((a) => a.employeeId === employee.id && a.date === d);
    const present = !!rec && rec.status === 'At-Work';
    const hol = holidayFor(d);
    let pay = 0;
    if (present) {
      pay = rate;
      if (rec?.holidayRule === '130%') pay = rate * 1.3;
      else if (rec?.holidayRule === '200%') pay = rate * 2;
      else if (rec?.holidayRule === 'No work no pay') pay = 0;
    }
    return {
      date: d,
      weekday: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      isSunday: dt.getDay() === 0,
      holidayName: hol?.name ?? null,
      present,
      holidayRule: rec?.holidayRule ?? '',
      pay: r2(pay),
      ot: rec?.otHours ?? 0,
    };
  });

  const daysPresent = days.filter((d) => d.present && d.pay > 0).length;
  const totalOT = r2(days.reduce((s, d) => s + d.ot, 0));
  const exemptCount = entry.exempt.filter(Boolean).length;
  const netLate = Math.max(0, entry.lateHours - exemptCount);

  const basicPay = r2(days.reduce((s, d) => s + d.pay, 0) + entry.halfDays * (rate / 2));
  const otPay = r2(totalOT * hourly);
  const lateDeduction = r2(netLate * hourly);
  const gross = r2(basicPay + otPay - lateDeduction);

  const pagibig = entry.pagibig ?? DEFAULT_PAGIBIG_WK;
  const philhealth = entry.philhealth ?? defaultPhilHealthWk(rate);
  const sss = entry.sss ?? DEFAULT_SSS_WK;
  const totalDeductions = r2(pagibig + philhealth + sss);
  const net = gross > 0 ? r2(gross - totalDeductions + entry.perfIncentive) : 0;

  return {
    employee,
    days,
    daysPresent,
    totalOT,
    lateHours: entry.lateHours,
    exemptCount,
    netLate,
    halfDays: entry.halfDays,
    hourlyRate: hourly,
    basicPay,
    otPay,
    lateDeduction,
    gross,
    pagibig,
    philhealth,
    sss,
    perfIncentive: entry.perfIncentive,
    totalDeductions,
    net,
  };
}

/** Doctor commission payroll over a 15-calendar-day cutoff window. */
export function doctorCutoffRange(cutoffDay: number, refISO: string): { start: string; end: string; label: string } {
  const ref = parseISO(refISO);
  const y = ref.getFullYear();
  const m = ref.getMonth();
  let start: Date;
  let end: Date;
  if (ref.getDate() <= cutoffDay) {
    start = new Date(y, m, 1);
    end = new Date(y, m, cutoffDay);
  } else {
    start = new Date(y, m, cutoffDay + 1);
    end = new Date(y, m + 1, 0); // last day of month
  }
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return { start: iso(start), end: iso(end), label: `${fmt(start)} – ${fmt(end)}` };
}

export interface DoctorPayrollRow {
  code: string;
  name: string;
  daysWorked: number;
  patients: number;
  grossBilled: number;
  commission: number;
}

export function doctorPayroll(state: AppState, start: string, end: string): DoctorPayrollRow[] {
  const inRange = state.transactions.filter((t) => t.apptDate >= start && t.apptDate <= end);
  return state.doctors.map((doc) => {
    const rows = inRange.filter((t) => t.dmdName === doc.name);
    return {
      code: doc.code,
      name: doc.name,
      daysWorked: new Set(rows.map((t) => t.apptDate)).size,
      patients: rows.length,
      grossBilled: r2(rows.reduce((s, t) => s + t.grossBill, 0)),
      commission: r2(rows.reduce((s, t) => s + commissionOf(t), 0)),
    };
  });
}

/** Monthly summary: net income after payroll & clinic expenses (dashboard-only formula). */
export function monthlySummary(state: AppState, month: string) {
  const tx = state.transactions.filter((t) => t.apptDate.startsWith(month));
  const grossBill = r2(tx.reduce((s, t) => s + t.grossBill, 0));
  const netSales = r2(tx.reduce((s, t) => s + t.netSales, 0));
  const doctorComm = r2(tx.reduce((s, t) => s + commissionOf(t), 0));

  const staff = state.employees.filter((e) => e.kind === 'staff');
  let staffPayroll = 0;
  for (const wk of monthWeeks(month)) {
    for (const emp of staff) staffPayroll += computeWeeklyPay(state, emp, month, wk).gross;
  }
  staffPayroll = r2(staffPayroll);

  const expenses = r2(
    state.expenses.filter((e) => e.month === month).reduce((s, e) => s + e.amount, 0),
  );
  const afterPayroll = r2(netSales - staffPayroll);
  const taxableNet = r2(afterPayroll - expenses);
  return { grossBill, netSales, doctorComm, staffPayroll, expenses, afterPayroll, taxableNet };
}
