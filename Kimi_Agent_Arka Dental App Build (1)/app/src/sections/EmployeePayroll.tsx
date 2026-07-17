import { useMemo, useRef, useState } from 'react';
import { CalendarCheck2, ChevronDown, Printer, UserPlus } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/lib/store';
import {
  computeWeeklyPay, fmtDate, holidayFor, iso, monthWeeks, salaryDayFor, weeklyKey,
} from '@/lib/calc';
import { COMPANY, DEFAULT_PAGIBIG_WK, DEFAULT_SSS_WK, peso } from '@/lib/constants';
import HireDialog from '@/components/HireDialog';
import DeleteRecords from '@/components/DeleteRecords';
import { printOnly } from '@/lib/print';
import { ARKA_LOGO_DATA_URI } from '@/lib/logo';
import type { AppState, WeeklyEntry } from '@/types';
import type { WeekDef, WeeklyPay } from '@/lib/calc';

const DONUT_COLORS = ['#0d9488', '#ef4444'];

/* ---------------- state helpers ---------------- */

function useWeeklyHelpers(month: string, week: WeekDef) {
  const [state, setState] = useApp();

  const toggleDay = (empId: string, date: string, checked: boolean) =>
    setState((s) => {
      const ex = s.attendance.find((a) => a.employeeId === empId && a.date === date);
      if (checked && !ex) {
        return {
          ...s,
          attendance: [
            ...s.attendance,
            { id: `${empId}-${date}`, employeeId: empId, date, status: 'At-Work' as const, holidayRule: '' as const, otHours: 0 },
          ],
        };
      }
      if (!checked && ex) return { ...s, attendance: s.attendance.filter((a) => a.id !== ex.id) };
      return s;
    });

  const setOT = (empId: string, date: string, ot: number) =>
    setState((s) => {
      const ex = s.attendance.find((a) => a.employeeId === empId && a.date === date);
      if (ex) {
        return { ...s, attendance: s.attendance.map((a) => (a.id === ex.id ? { ...a, otHours: ot } : a)) };
      }
      if (ot > 0) {
        return {
          ...s,
          attendance: [
            ...s.attendance,
            { id: `${empId}-${date}`, employeeId: empId, date, status: 'At-Work' as const, holidayRule: '' as const, otHours: ot },
          ],
        };
      }
      return s;
    });

  const setHolidayRule = (empId: string, date: string, rule: string) =>
    setState((s) => ({
      ...s,
      attendance: s.attendance.map((a) =>
        a.employeeId === empId && a.date === date
          ? { ...a, holidayRule: (rule === 'none' ? '' : rule) as never }
          : a,
      ),
    }));

  const patchEntry = (empId: string, patch: Partial<WeeklyEntry>) =>
    setState((s) => {
      const k = weeklyKey(empId, month, week.key);
      const cur = s.weekly[k] ?? {
        lateHours: 0, exempt: [false, false, false], halfDays: 0,
        pagibig: null, philhealth: null, sss: null, perfIncentive: 0,
      };
      return { ...s, weekly: { ...s.weekly, [k]: { ...cur, ...patch } } };
    });

  return { state, toggleDay, setOT, setHolidayRule, patchEntry };
}

/* ---------------- Payslip ---------------- */

function Payslip({ state, pay, week, month }: { state: AppState; pay: WeeklyPay; week: WeekDef; month: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const e = pay.employee;

  const ytd = useMemo(() => {
    const year = month.slice(0, 4);
    let sum = 0;
    for (let m = 1; m <= Number(month.slice(5)); m++) {
      const mk = `${year}-${String(m).padStart(2, '0')}`;
      for (const wk of monthWeeks(mk)) {
        if (mk === month && wk.key > week.key) continue;
        sum += computeWeeklyPay(state, e, mk, wk).net;
      }
    }
    return sum;
  }, [state, e, month, week.key]);

  const donut = pay.totalDeductions > 0
    ? [{ name: 'Net Pay', value: pay.net }, { name: 'Deductions', value: pay.totalDeductions }]
    : [{ name: 'Net Pay', value: pay.net }];

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{e.name} {e.staffCode ? `(${e.staffCode})` : ''}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => printOnly(ref.current)}>
          <Printer className="h-4 w-4 mr-1" /> Print Payslip PDF
        </Button>
      </CardHeader>
      <CardContent>
        <div
          ref={ref}
          className="paystub-wm rounded-lg border bg-white p-5 text-sm"
          style={{ ['--wm-img' as never]: `url("${ARKA_LOGO_DATA_URI}")` }}
        >
          <div className="text-center">
            <h3 className="text-lg font-bold tracking-wide">{COMPANY.name}</h3>
            <p className="text-xs text-muted-foreground">{COMPANY.address}</p>
            <p className="mt-1 font-semibold">WEEKLY PAYSLIP — {week.label}</p>
            <p className="text-xs text-muted-foreground">
              Period: {fmtDate(week.dates[0])} – {fmtDate(week.dates[week.dates.length - 1])} · Salary day: {fmtDate(salaryDayFor(week))}
            </p>
          </div>
          <Separator className="my-3" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <span className="text-muted-foreground">Employee</span><span className="font-medium text-right">{e.name}</span>
            <span className="text-muted-foreground">Daily rate (8 hrs, lunch not paid)</span><span className="text-right">{peso(e.dailyRate)}</span>
            <span className="text-muted-foreground">Hourly rate</span><span className="text-right">{peso(pay.hourlyRate)}</span>
            <span className="text-muted-foreground">Days present</span><span className="text-right">{pay.daysPresent}{pay.halfDays ? ` + ${pay.halfDays} half day${pay.halfDays > 1 ? 's' : ''}` : ''}</span>
          </div>

          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Holiday</TableHead>
                <TableHead className="text-right">OT</TableHead><TableHead className="text-right">Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pay.days.map((d) => (
                <TableRow key={d.date} className={d.isSunday ? 'text-muted-foreground' : ''}>
                  <TableCell>{d.weekday} {fmtDate(d.date)}</TableCell>
                  <TableCell>
                    {d.isSunday && !d.present ? 'Rest day' : d.present ? 'Present' : '—'}
                    {d.holidayRule ? ` · ${d.holidayRule}` : ''}
                  </TableCell>
                  <TableCell className="text-xs">{d.holidayName ?? '—'}</TableCell>
                  <TableCell className="text-right">{d.ot ? `${d.ot} hr` : '—'}</TableCell>
                  <TableCell className="text-right">{d.pay ? peso(d.pay) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
            <span className="text-muted-foreground">Basic pay (days × rate)</span><span className="text-right">{peso(pay.basicPay)}</span>
            <span className="text-muted-foreground">OT pay ({pay.totalOT} hr × {peso(pay.hourlyRate)})</span><span className="text-right">{peso(pay.otPay)}</span>
            <span className="text-muted-foreground">Late deduction ({pay.netLate} hr net of {pay.exemptCount} exempt)</span><span className="text-right">− {peso(pay.lateDeduction)}</span>
            <span className="font-semibold">Gross weekly pay</span><span className="text-right font-semibold">{peso(pay.gross)}</span>
          </div>

          <Separator className="my-3" />
          <p className="font-medium">Deductions (weekly)</p>
          <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1">
            <span className="text-muted-foreground">Pag-IBIG</span><span className="text-right">− {peso(pay.pagibig)}</span>
            <span className="text-muted-foreground">PhilHealth (employee share)</span><span className="text-right">− {peso(pay.philhealth)}</span>
            <span className="text-muted-foreground">SSS (employee share)</span><span className="text-right">− {peso(pay.sss)}</span>
            <span className="text-muted-foreground">Performance incentive</span><span className="text-right">+ {peso(pay.perfIncentive)}</span>
          </div>

          <Separator className="my-3" />
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-base font-bold">NET WEEKLY SALARY: <span className="text-teal-700">{peso(pay.net)}</span></p>
              <p className="text-xs text-muted-foreground">YTD net pay: {peso(ytd)}</p>
            </div>
            <div className="h-28 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={22} outerRadius={38} paddingAngle={3}>
                    {donut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => peso(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <Collapsible className="mt-2">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-3 w-3" /> How deductions are calculated
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-1 text-[11px] text-muted-foreground">
              <p>Monthly gross (26 working days): {peso(e.dailyRate)}/day × 26 = {peso(e.dailyRate * 26)}.</p>
              <p>Pag-IBIG: ₱200.00/month (₱{DEFAULT_PAGIBIG_WK.toFixed(2)}/week default, editable).</p>
              <p>PhilHealth 2026: 5% of monthly basic salary, shared equally — employee share ÷ 4 weeks, editable per week.</p>
              <p>SSS: ₱{DEFAULT_SSS_WK.toFixed(2)}/week default employee share, editable.</p>
              <p>BIR: monthly taxable income of ₱20,833 or below is exempt from withholding tax → ₱0.00.</p>
              <p>Late: each exemption checkbox forgives 1 late hour (max 3); net late hours × hourly rate = deduction.</p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Main section ---------------- */

export default function EmployeePayroll() {
  const [month, setMonth] = useState(() => iso(new Date()).slice(0, 7));
  const weeks = useMemo(() => monthWeeks(month), [month]);
  const [weekKey, setWeekKey] = useState('W1');
  const week = weeks.find((w) => w.key === weekKey) ?? weeks[0];
  const { state, toggleDay, setOT, setHolidayRule, patchEntry } = useWeeklyHelpers(month, week);

  const staff = state.employees.filter((e) => e.kind === 'staff');
  const pays = useMemo(
    () => staff.map((e) => computeWeeklyPay(state, e, month, week)),
    [state, staff, month, week],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5" /> Weekly Attendance Checker & Salary
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input type="month" className="w-40" value={month} onChange={(e) => setMonth(e.target.value)} />
            <HireDialog kind="staff" trigger={<Button variant="outline"><UserPlus className="h-4 w-4 mr-1" /> New Hire</Button>} />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={week.key} onValueChange={setWeekKey}>
            <TabsList className="grid grid-cols-4 w-full max-w-xl">
              {weeks.map((w) => <TabsTrigger key={w.key} value={w.key}>{w.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground mt-2">
            {fmtDate(week.dates[0])} – {fmtDate(week.dates[week.dates.length - 1])} · Salary day: <b>{fmtDate(salaryDayFor(week))}</b> (always before Sunday / non-working holiday)
          </p>
        </CardContent>
      </Card>

      {/* Attendance checker per employee */}
      {pays.map((pay) => {
        const e = pay.employee;
        const entryKey = weeklyKey(e.id, month, week.key);
        const entry = state.weekly[entryKey] ?? {
          lateHours: 0, exempt: [false, false, false], halfDays: 0,
          pagibig: null, philhealth: null, sss: null, perfIncentive: 0,
        };
        return (
          <Card key={e.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {e.name} {e.staffCode && <Badge variant="secondary">{e.staffCode}</Badge>}
                <span className="text-sm font-normal text-muted-foreground">
                  {peso(e.dailyRate)}/day · {peso(pay.hourlyRate)}/hr
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Day grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {pay.days.map((d) => {
                  const hol = holidayFor(d.date);
                  return (
                    <div
                      key={d.date}
                      className={`rounded-lg border p-2 text-center ${d.isSunday ? 'bg-muted/60' : ''} ${d.present ? 'border-teal-500 bg-teal-50' : ''}`}
                    >
                      <p className="text-xs font-medium">{d.weekday} {fmtDate(d.date).slice(0, 5)}</p>
                      {hol && <p className="text-[10px] text-amber-600 leading-tight">{hol.name}</p>}
                      <label className="mt-1 flex items-center justify-center gap-1 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={d.present}
                          onChange={(ev) => toggleDay(e.id, d.date, ev.target.checked)}
                        />
                        {d.isSunday ? 'Sun (opt.)' : 'Present'}
                      </label>
                      <Input
                        type="number" min={0} step={0.5} placeholder="OT hr"
                        className="mt-1 h-7 text-xs"
                        value={d.ot || ''}
                        onChange={(ev) => setOT(e.id, d.date, Number(ev.target.value))}
                      />
                      {d.present && hol && (
                        <Select value={d.holidayRule || 'none'} onValueChange={(v) => setHolidayRule(e.id, d.date, v)}>
                          <SelectTrigger className="mt-1 h-7 text-[11px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Regular pay</SelectItem>
                            <SelectItem value="130%">130%</SelectItem>
                            <SelectItem value="200%">200%</SelectItem>
                            <SelectItem value="No work no pay">No work no pay</SelectItem>
                            <SelectItem value="PH-HL Paid leave">PH-HL Paid leave</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Week inputs */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Late hours</Label>
                  <Input type="number" min={0} step={0.5} value={entry.lateHours || ''} onChange={(ev) => patchEntry(e.id, { lateHours: Number(ev.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Late exemptions (max 3)</Label>
                  <div className="flex gap-2 pt-2">
                    {[0, 1, 2].map((i) => (
                      <label key={i} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={entry.exempt[i] ?? false}
                          onChange={(ev) => {
                            const next = [...entry.exempt];
                            next[i] = ev.target.checked;
                            patchEntry(e.id, { exempt: next });
                          }}
                        />
                        {i + 1}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Half-day count</Label>
                  <Input type="number" min={0} value={entry.halfDays || ''} onChange={(ev) => patchEntry(e.id, { halfDays: Number(ev.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Performance incentive ₱</Label>
                  <Input type="number" min={0} value={entry.perfIncentive || ''} onChange={(ev) => patchEntry(e.id, { perfIncentive: Number(ev.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pag-IBIG ₱</Label>
                  <Input type="number" min={0} placeholder={String(DEFAULT_PAGIBIG_WK)} value={entry.pagibig ?? ''} onChange={(ev) => patchEntry(e.id, { pagibig: ev.target.value === '' ? null : Number(ev.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">PhilHealth ₱</Label>
                  <Input type="number" min={0} placeholder={String(pay.philhealth)} value={entry.philhealth ?? ''} onChange={(ev) => patchEntry(e.id, { philhealth: ev.target.value === '' ? null : Number(ev.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SSS ₱</Label>
                  <Input type="number" min={0} placeholder={String(DEFAULT_SSS_WK)} value={entry.sss ?? ''} onChange={(ev) => patchEntry(e.id, { sss: ev.target.value === '' ? null : Number(ev.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Net weekly salary</Label>
                  <p className="h-9 flex items-center font-bold text-teal-700">{peso(pay.net)}</p>
                </div>
              </div>

              {/* Computed strip */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground border-t pt-2">
                <span>Days present: <b className="text-foreground">{pay.daysPresent}</b></span>
                <span>Total OT: <b className="text-foreground">{pay.totalOT} hr</b></span>
                <span>Net late: <b className="text-foreground">{pay.netLate} hr</b></span>
                <span>Basic: <b className="text-foreground">{peso(pay.basicPay)}</b></span>
                <span>OT pay: <b className="text-foreground">{peso(pay.otPay)}</b></span>
                <span>Late ded.: <b className="text-foreground">−{peso(pay.lateDeduction)}</b></span>
                <span>Gross: <b className="text-foreground">{peso(pay.gross)}</b></span>
                <span>Deductions: <b className="text-foreground">−{peso(pay.totalDeductions)}</b></span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Weekly summary table (Excel layout) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{week.label} — Summary</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff_Name</TableHead>
                <TableHead className="text-right">Daily_Rate</TableHead>
                <TableHead className="text-right">Hourly_Rate</TableHead>
                <TableHead className="text-center">Att (per day)</TableHead>
                <TableHead className="text-right">Days_Present</TableHead>
                <TableHead className="text-right">Total_OT_Hrs</TableHead>
                <TableHead className="text-right">Net_Late_Hrs</TableHead>
                <TableHead className="text-right">Half_Day</TableHead>
                <TableHead className="text-right">Basic_Pay</TableHead>
                <TableHead className="text-right">OT_Pay</TableHead>
                <TableHead className="text-right">Late_Deduction</TableHead>
                <TableHead className="text-right">Gross_Weekly_Pay</TableHead>
                <TableHead className="text-right">PagIBIG</TableHead>
                <TableHead className="text-right">PhilHealth</TableHead>
                <TableHead className="text-right">SSS</TableHead>
                <TableHead className="text-right">Perf_Incentive</TableHead>
                <TableHead className="text-right">Net_Weekly_Salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pays.map((p) => (
                <TableRow key={p.employee.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {p.employee.name} {p.employee.staffCode ? `(${p.employee.staffCode})` : ''}
                  </TableCell>
                  <TableCell className="text-right">{peso(p.employee.dailyRate)}</TableCell>
                  <TableCell className="text-right">{peso(p.hourlyRate)}</TableCell>
                  <TableCell className="text-center whitespace-nowrap tracking-tight">
                    {p.days.filter((d) => !d.isSunday).map((d) => (d.present ? '☑' : '☐')).join(' ')}
                  </TableCell>
                  <TableCell className="text-right">{p.daysPresent}</TableCell>
                  <TableCell className="text-right">{p.totalOT}</TableCell>
                  <TableCell className="text-right">{p.netLate}</TableCell>
                  <TableCell className="text-right">{p.halfDays}</TableCell>
                  <TableCell className="text-right">{peso(p.basicPay)}</TableCell>
                  <TableCell className="text-right">{peso(p.otPay)}</TableCell>
                  <TableCell className="text-right">{peso(p.lateDeduction)}</TableCell>
                  <TableCell className="text-right font-medium">{peso(p.gross)}</TableCell>
                  <TableCell className="text-right">{peso(p.pagibig)}</TableCell>
                  <TableCell className="text-right">{peso(p.philhealth)}</TableCell>
                  <TableCell className="text-right">{peso(p.sss)}</TableCell>
                  <TableCell className="text-right">{peso(p.perfIncentive)}</TableCell>
                  <TableCell className="text-right font-bold text-teal-700">{peso(p.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payslips */}
      <div className="space-y-4">
        {pays.map((p) => (
          <Payslip key={p.employee.id} state={state} pay={p} week={week} month={month} />
        ))}
      </div>

      <DeleteRecords kind="staff" />
    </div>
  );
}
