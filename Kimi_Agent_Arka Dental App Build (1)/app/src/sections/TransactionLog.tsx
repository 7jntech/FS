import { useMemo, useState } from 'react';
import { Eye, EyeOff, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useApp, uid } from '@/lib/store';
import { computeTransaction, defaultAmountPaid, fmtDate, iso } from '@/lib/calc';
import { COMM_PCT_OPTIONS, DISCOUNT_TYPES, MERCHANT_FEE_RATES, PAYMENT_MODES, peso } from '@/lib/constants';
import { exportMonthToExcel } from '@/lib/exportXlsx';
import type { Transaction } from '@/types';

const NONE = '__none__';
const CUSTOM = '__custom__';

const emptyForm = () => ({
  dmdName: '',
  apptDate: iso(new Date()),
  patientName: '',
  procedureType: '',
  customProcedure: '',
  grossBill: 0,
  grossEdited: false,
  discountType: NONE,
  amountPaid: 0,
  paidEdited: false,
  dentistCommPct: 10,
  paymentMode: 'Cash',
  remarks: '',
});

export default function TransactionLog() {
  const [state, setState] = useApp();
  const [form, setForm] = useState(emptyForm());
  const [showHidden, setShowHidden] = useState(false);
  const [monthFilter, setMonthFilter] = useState(() => iso(new Date()).slice(0, 7));
  const [editId, setEditId] = useState<string | null>(null);
  const [exportFlash, setExportFlash] = useState<string | null>(null);

  const priceOf = (name: string) => state.procedures.find((p) => p.name === name)?.price ?? 0;

  const rows = useMemo(
    () =>
      state.transactions
        .filter((t) => t.apptDate.startsWith(monthFilter))
        .sort((a, b) => a.apptDate.localeCompare(b.apptDate)),
    [state.transactions, monthFilter],
  );

  const totals = useMemo(
    () => ({
      gross: rows.reduce((s, t) => s + t.grossBill, 0),
      paid: rows.reduce((s, t) => s + t.amountPaid, 0),
      comm: rows.reduce((s, t) => s + t.amountPaid * (t.dentistCommPct / 100), 0),
      fee: rows.reduce((s, t) => s + t.merchantFee, 0),
      net: rows.reduce((s, t) => s + t.netSales, 0),
    }),
    [rows],
  );

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const onProcedure = (v: string) => {
    if (v === CUSTOM) {
      set({ procedureType: CUSTOM, grossEdited: false });
      return;
    }
    const price = priceOf(v);
    const gross = price;
    set({
      procedureType: v,
      grossBill: gross,
      grossEdited: false,
      amountPaid: defaultAmountPaid(gross, form.discountType === NONE ? '' : form.discountType),
      paidEdited: false,
    });
  };

  const onDiscount = (v: string) => {
    const dt = v === NONE ? '' : v;
    set({ discountType: v, amountPaid: defaultAmountPaid(form.grossBill, dt), paidEdited: false });
  };

  const submit = () => {
    const proc = form.procedureType === CUSTOM ? form.customProcedure.trim() : form.procedureType;
    if (!form.dmdName || !proc || !form.patientName.trim()) return;
    const tx: Transaction = computeTransaction({
      id: editId ?? uid(),
      dmdName: form.dmdName,
      apptDate: form.apptDate,
      patientName: form.patientName.trim(),
      procedureType: proc,
      grossBill: form.grossBill,
      discountType: form.discountType === NONE ? '' : form.discountType,
      amountPaid: form.amountPaid,
      dentistCommPct: form.dentistCommPct,
      paymentMode: form.paymentMode,
      netIncomeAfterComm: 0,
      merchantFee: 0,
      netSales: 0,
      remarks: form.remarks.trim(),
    });
    setState((s) => ({
      ...s,
      transactions: editId
        ? s.transactions.map((t) => (t.id === editId ? tx : t))
        : [...s.transactions, tx],
    }));
    setForm(emptyForm());
    setEditId(null);
  };

  const startEdit = (t: Transaction) => {
    setEditId(t.id);
    const known = state.procedures.some((p) => p.name === t.procedureType);
    setForm({
      dmdName: t.dmdName,
      apptDate: t.apptDate,
      patientName: t.patientName,
      procedureType: known ? t.procedureType : CUSTOM,
      customProcedure: known ? '' : t.procedureType,
      grossBill: t.grossBill,
      grossEdited: true,
      discountType: t.discountType || NONE,
      amountPaid: t.amountPaid,
      paidEdited: true,
      dentistCommPct: t.dentistCommPct,
      paymentMode: t.paymentMode,
      remarks: t.remarks,
    });
  };

  const remove = (id: string) =>
    setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{editId ? 'Edit Transaction' : 'New Transaction'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label>DMD Name</Label>
              <Select value={form.dmdName} onValueChange={(v) => set({ dmdName: v })}>
                <SelectTrigger><SelectValue placeholder="Doctor" /></SelectTrigger>
                <SelectContent>
                  {state.doctors.map((d) => (
                    <SelectItem key={d.code} value={d.name}>{d.name} ({d.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Appt Date (mm/dd/yyyy)</Label>
              <Input type="date" value={form.apptDate} onChange={(e) => set({ apptDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Patient Name</Label>
              <Input value={form.patientName} onChange={(e) => set({ patientName: e.target.value })} placeholder="As in import / patients log" />
            </div>
            <div className="space-y-1">
              <Label>Procedure Type</Label>
              <Select value={form.procedureType} onValueChange={onProcedure}>
                <SelectTrigger><SelectValue placeholder="Procedure" /></SelectTrigger>
                <SelectContent>
                  {state.procedures.map((p) => (
                    <SelectItem key={p.name} value={p.name}>{p.name} — {peso(p.price)}</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>+ Add procedure (admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.procedureType === CUSTOM && (
              <div className="space-y-1">
                <Label>Custom Procedure</Label>
                <Input value={form.customProcedure} onChange={(e) => set({ customProcedure: e.target.value })} placeholder="Follow Con/Op format" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Gross Bill</Label>
              <Input
                type="number" min={0} value={form.grossBill || ''}
                onChange={(e) => set({ grossBill: Number(e.target.value), grossEdited: true, amountPaid: form.paidEdited ? form.amountPaid : Number(e.target.value) })}
              />
              {form.grossEdited && <p className="text-[11px] text-amber-600">Manual override (additional procedure)</p>}
            </div>
            <div className="space-y-1">
              <Label>Discount Type</Label>
              <Select value={form.discountType} onValueChange={onDiscount}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {DISCOUNT_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount Paid</Label>
              <Input type="number" min={0} value={form.amountPaid || ''} onChange={(e) => set({ amountPaid: Number(e.target.value), paidEdited: true })} />
            </div>
            <div className="space-y-1">
              <Label>Dentist Comm %</Label>
              <Select value={String(form.dentistCommPct)} onValueChange={(v) => set({ dentistCommPct: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMM_PCT_OPTIONS.map((p) => <SelectItem key={p} value={String(p)}>{p}%</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Payment Mode</Label>
              <Select value={form.paymentMode} onValueChange={(v) => set({ paymentMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => {
                    const rate = MERCHANT_FEE_RATES[m];
                    return (
                      <SelectItem key={m} value={m}>
                        {m}{rate ? ` — ${(rate * 100).toFixed(1)}% MDR` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Remarks</Label>
              <Input value={form.remarks} onChange={(e) => set({ remarks: e.target.value })} placeholder="Free text" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={submit} disabled={!form.dmdName || !form.procedureType || !form.patientName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> {editId ? 'Save Changes' : 'Add Transaction'}
            </Button>
            {editId && <Button variant="ghost" onClick={() => { setEditId(null); setForm(emptyForm()); }}>Cancel</Button>}
            <p className="text-xs text-muted-foreground">
              Net Sales = Amount Paid − Dentist Commission − Merchant Fee (Cards 3.5% · GCash 2.0% · Maya QR 1.5%)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Transaction Log</CardTitle>
          <div className="flex items-center gap-2">
            {exportFlash && <span className="text-xs text-emerald-600 mr-1">{exportFlash}</span>}
            <Input type="month" className="w-40" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
            <Button
              variant="outline" size="sm"
              onClick={() => {
                const r = exportMonthToExcel(state, monthFilter);
                setExportFlash(`Downloaded: ${r.txCount} transaction(s), ${r.expCount} expense(s) · Net ${r.totalNet}`);
                setTimeout(() => setExportFlash(null), 5000);
              }}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Print Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showHidden ? 'Hide' : 'Show'} Net after Comm
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DMD_Name</TableHead>
                <TableHead>Appt_Date</TableHead>
                <TableHead>Patient_Name</TableHead>
                <TableHead>Procedure_Type</TableHead>
                <TableHead className="text-right">Gross_Bill</TableHead>
                <TableHead>Discount_Type</TableHead>
                <TableHead className="text-right">Amount_Paid</TableHead>
                <TableHead>Comm_%</TableHead>
                <TableHead>Payment_Mode</TableHead>
                {showHidden && <TableHead className="text-right text-muted-foreground">Net_Income_After_Comm</TableHead>}
                <TableHead className="text-right">Merchant_Fee</TableHead>
                <TableHead className="text-right">Net_Sales</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">No transactions for this month yet.</TableCell></TableRow>
              )}
              {rows.map((t) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => startEdit(t)}>
                  <TableCell><Badge variant="secondary">{state.doctors.find((d) => d.name === t.dmdName)?.code ?? '—'}</Badge> <span className="hidden xl:inline">{t.dmdName}</span></TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDate(t.apptDate)}</TableCell>
                  <TableCell>{t.patientName}</TableCell>
                  <TableCell>{t.procedureType}</TableCell>
                  <TableCell className="text-right">{peso(t.grossBill)}</TableCell>
                  <TableCell>{t.discountType || '—'}</TableCell>
                  <TableCell className="text-right">{peso(t.amountPaid)}</TableCell>
                  <TableCell>{t.dentistCommPct}%</TableCell>
                  <TableCell>{t.paymentMode}</TableCell>
                  {showHidden && <TableCell className="text-right text-muted-foreground">{peso(t.netIncomeAfterComm)}</TableCell>}
                  <TableCell className="text-right">{t.merchantFee ? peso(t.merchantFee) : '—'}</TableCell>
                  <TableCell className="text-right font-medium">{peso(t.netSales)}</TableCell>
                  <TableCell className="max-w-[160px] truncate">{t.remarks}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(t.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length > 0 && (
                <TableRow className="bg-muted/60 font-semibold">
                  <TableCell colSpan={4}>Totals ({rows.length} visits)</TableCell>
                  <TableCell className="text-right">{peso(totals.gross)}</TableCell>
                  <TableCell />
                  <TableCell className="text-right">{peso(totals.paid)}</TableCell>
                  <TableCell className="text-right text-xs self-center">−{peso(totals.comm)}</TableCell>
                  <TableCell />
                  {showHidden && <TableCell />}
                  <TableCell className="text-right">{peso(totals.fee)}</TableCell>
                  <TableCell className="text-right">{peso(totals.net)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
