import { useMemo, useRef, useState } from 'react';
import { Lock, Printer, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useApp } from '@/lib/store';
import { commissionOf, doctorCutoffRange, doctorPayroll, fmtDate, iso } from '@/lib/calc';
import { peso } from '@/lib/constants';
import HireDialog from '@/components/HireDialog';
import DeleteRecords from '@/components/DeleteRecords';
import { printOnly } from '@/lib/print';

export default function DoctorPayroll() {
  const [state, setState] = useApp();
  const [fullName, setFullName] = useState(true);
  const [refDate, setRefDate] = useState(() => iso(new Date()));
  const [cutoffDay, setCutoffDay] = useState(state.payroll.doctorCutoffDay1 || 15);
  const [disburse, setDisburse] = useState(state.payroll.doctorDisbursementDate);
  const [lockedFlash, setLockedFlash] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const range = useMemo(() => doctorCutoffRange(cutoffDay, refDate), [cutoffDay, refDate]);
  const rows = useMemo(() => doctorPayroll(state, range.start, range.end), [state, range]);
  const totalComm = rows.reduce((s, r) => s + r.commission, 0);

  const display = (name: string) => {
    if (fullName) return name;
    return state.doctors.find((d) => d.name === name)?.code ?? name;
  };

  const saveLock = () => {
    setState((s) => ({
      ...s,
      payroll: { ...s.payroll, doctorCutoffDay1: cutoffDay, doctorDisbursementDate: disburse, locked: true },
    }));
    setLockedFlash(true);
    setTimeout(() => setLockedFlash(false), 3000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Dentist Commission Payroll</CardTitle>
          <HireDialog kind="doctor" trigger={<Button variant="outline"><UserPlus className="h-4 w-4 mr-1" /> New Hire Doctor</Button>} />
        </CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-4 items-end">
          <div className="space-y-1">
            <Label>Reference date</Label>
            <Input type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Cut-off day (15-calendar-day routine)</Label>
            <Input type="number" min={1} max={28} value={cutoffDay} onChange={(e) => setCutoffDay(Number(e.target.value) || 15)} />
          </div>
          <div className="space-y-1">
            <Label>Actual disbursement date</Label>
            <Input type="date" value={disburse} onChange={(e) => setDisburse(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch checked={fullName} onCheckedChange={setFullName} id="nameswitch" />
            <Label htmlFor="nameswitch" className="text-sm">{fullName ? 'Full name' : 'Code'} display</Label>
          </div>
          <Button onClick={saveLock}><Lock className="h-4 w-4 mr-1" /> Save — Lock & Sync</Button>
        </CardContent>
        {lockedFlash && (
          <p className="px-6 pb-3 text-sm text-emerald-600">Cut-off routine saved. System locked and synced.</p>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Current cut-off: <span className="text-teal-700">{range.label}</span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => printOnly(printRef.current)}>
            <Printer className="h-4 w-4 mr-1" /> Print Payslip PDF
          </Button>
        </CardHeader>
        <CardContent ref={printRef}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DMD_Name</TableHead>
                <TableHead className="text-right">Days at work</TableHead>
                <TableHead className="text-right">Patients</TableHead>
                <TableHead className="text-right">Gross billed</TableHead>
                <TableHead className="text-right">Total commission earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell className="font-medium">{display(r.name)}</TableCell>
                  <TableCell className="text-right">{r.daysWorked}</TableCell>
                  <TableCell className="text-right">{r.patients}</TableCell>
                  <TableCell className="text-right">{peso(r.grossBilled)}</TableCell>
                  <TableCell className="text-right font-semibold text-teal-700">{peso(r.commission)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/60 font-bold">
                <TableCell colSpan={4}>Combined commission (3 doctors)</TableCell>
                <TableCell className="text-right">{peso(totalComm)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-[11px] text-muted-foreground mt-2">
            Payroll per doctor = sum of commissions on all days each doctor comes to work within the 15-calendar-day cut-off.
          </p>
        </CardContent>
      </Card>

      {rows.filter((r) => r.patients > 0).map((r) => {
        const tx = state.transactions.filter(
          (t) => t.dmdName === r.name && t.apptDate >= range.start && t.apptDate <= range.end,
        );
        return (
          <Card key={r.code}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{display(r.name)} — transaction format (adopted from Transaction Log)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {['Appt_Date', 'Patient_Name', 'Procedure_Type', 'Gross_Bill', 'Discount_Type', 'Amount_Paid', 'Comm_%', 'Commission', 'Payment_Mode', 'Net_Sales'].map((h) => (
                      <TableHead key={h} className={['Gross_Bill', 'Amount_Paid', 'Commission', 'Net_Sales'].includes(h) ? 'text-right' : ''}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tx.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">{fmtDate(t.apptDate)}</TableCell>
                      <TableCell>{t.patientName}</TableCell>
                      <TableCell>{t.procedureType}</TableCell>
                      <TableCell className="text-right">{peso(t.grossBill)}</TableCell>
                      <TableCell>{t.discountType || '—'}</TableCell>
                      <TableCell className="text-right">{peso(t.amountPaid)}</TableCell>
                      <TableCell>{t.dentistCommPct}%</TableCell>
                      <TableCell className="text-right">{peso(commissionOf(t))}</TableCell>
                      <TableCell>{t.paymentMode}</TableCell>
                      <TableCell className="text-right">{peso(t.netSales)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <DeleteRecords kind="doctor" />
    </div>
  );
}
