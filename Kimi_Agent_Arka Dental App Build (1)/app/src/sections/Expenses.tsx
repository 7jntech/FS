import { useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, PieChart as PieIcon, Plus, Trash2 } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useApp, uid } from '@/lib/store';
import { iso, monthlySummary } from '@/lib/calc';
import { EXPENSE_CATEGORIES, peso } from '@/lib/constants';

const COLORS = ['#0d9488', '#f59e0b', '#ef4444'];
const CUSTOM = '__custom__';

interface Draft {
  item: string;   // selected label or CUSTOM
  custom: string; // custom label text
  amount: string;
  note: string;
}

const blankDraft = (): Draft => ({ item: '', custom: '', amount: '', note: '' });

export default function Expenses() {
  const [state, setState] = useApp();
  const [month, setMonth] = useState(() => iso(new Date()).slice(0, 7));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const [taxSavedFlash, setTaxSavedFlash] = useState(false);

  const entries = useMemo(() => state.expenses.filter((e) => e.month === month), [state.expenses, month]);
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const summary = useMemo(() => monthlySummary(state, month), [state, month]);

  const setD = (key: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [key]: { ...blankDraft(), ...d[key], ...patch } }));

  const onPickItem = (catKey: string, label: string) => {
    if (label === CUSTOM) {
      setD(catKey, { item: CUSTOM, amount: '' });
      return;
    }
    const preset = EXPENSE_CATEGORIES.find((c) => c.key === catKey)?.items.find((i) => i.label === label);
    setD(catKey, { item: label, amount: preset?.price != null ? String(preset.price) : '' });
  };

  const submit = (catKey: string) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.key === catKey)!;
    const d = drafts[catKey];
    if (!d || !d.item || !d.amount) return;
    const label = d.item === CUSTOM ? d.custom.trim() : d.item;
    if (!label) return;
    setState((s) => ({
      ...s,
      expenses: [
        ...s.expenses,
        { id: uid(), month, category: catKey, label: `${cat.label} — ${label}`, amount: Number(d.amount) || 0, note: d.note.trim() },
      ],
    }));
    setD(catKey, blankDraft());
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const remove = (id: string) =>
    setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }));

  const donut = [
    { name: 'Gross Bill', value: summary.grossBill },
    { name: 'Doctor Commission', value: summary.doctorComm },
    { name: 'Clinic Expenses', value: summary.expenses },
  ].filter((d) => d.value > 0);

  const taxes = state.taxes[month] ?? { birTax: '', withholdingTax: '', itr: '' };
  const setTax = (key: 'birTax' | 'withholdingTax' | 'itr', val: string) =>
    setState((s) => ({
      ...s,
      taxes: { ...s.taxes, [month]: { ...taxes, [key]: val } },
    }));
  const saveTaxes = () => {
    setTaxSavedFlash(true);
    setTimeout(() => setTaxSavedFlash(false), 2000);
  };

  const monthLabel = new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long' });

  const BIR_LINKS = [
    { label: 'BIR Form 2551Q — Quarterly Percentage Tax Return (PDF)', url: 'https://bir-cdn.bir.gov.ph/local/pdf/2551Q%20Jan%202018%20ENCS%20final%20rev%203_copy.pdf' },
    { label: 'BIR Form 1601-EQ — Quarterly Remittance Return of Creditable Income Taxes Withheld (PDF)', url: 'https://bir-cdn.bir.gov.ph/local/pdf/1601-EQ%20January%202019%20ENCS%20final.pdf' },
    { label: 'BIR Form 1701Q — Quarterly Income Tax Return (eFPS)', url: 'https://efps.bir.gov.ph/efps-war/EFPSWeb_war/forms2018Version/1701Q/1701q_v3_01.xhtml' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Fixed Monthly Expenses</CardTitle>
          <Input type="month" className="w-40" value={month} onChange={(e) => setMonth(e.target.value)} />
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {EXPENSE_CATEGORIES.map((c) => {
              const d = drafts[c.key] ?? blankDraft();
              const canAdd = d.item && (d.item !== CUSTOM || d.custom.trim()) && d.amount;
              return (
                <div key={c.key} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">{c.label}</Label>
                    {c.key === 'marketing' && <Badge variant="outline" className="text-[10px]">optional</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">{c.hint}</p>
                  <Select value={d.item} onValueChange={(v) => onPickItem(c.key, v)}>
                    <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>
                      {c.items.map((i) => (
                        <SelectItem key={i.label} value={i.label}>
                          {i.label}{i.price != null ? ` — ${peso(i.price)}` : ''}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM}>+ Other (free text)</SelectItem>
                    </SelectContent>
                  </Select>
                  {d.item === CUSTOM && (
                    <Input placeholder="Item name" value={d.custom} onChange={(e) => setD(c.key, { custom: e.target.value })} />
                  )}
                  <Input
                    type="number" min={0} placeholder="₱ amount"
                    value={d.amount} onChange={(e) => setD(c.key, { amount: e.target.value })}
                  />
                  <Input placeholder="Note (optional)" value={d.note} onChange={(e) => setD(c.key, { note: e.target.value })} />
                  <Button size="sm" variant="secondary" className="w-full" disabled={!canAdd} onClick={() => submit(c.key)}>
                    <Plus className="h-4 w-4 mr-1" /> Add to {c.label}
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-4">
            {savedFlash && <span className="text-sm text-emerald-600">Saved — system synced.</span>}
            <span className="ml-auto text-sm font-semibold">
              Total of Expenses ({month}): <span className="text-red-600">{peso(total)}</span>
            </span>
          </div>

          {entries.length > 0 && (
            <div className="mt-4 divide-y rounded-lg border">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-64 font-medium truncate">{e.label}</span>
                  <span className="w-28 text-right">{peso(e.amount)}</span>
                  <span className="flex-1 text-muted-foreground truncate">{e.note}</span>
                  <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><PieIcon className="h-5 w-5" /> Gross vs Commission vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {donut.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {donut.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => peso(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground pt-16 text-center">No data for {month} yet.</p>
            )}
          </CardContent>
          <div className="px-6 pb-4 flex flex-wrap gap-4 text-xs">
            {donut.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {d.name}: <b>{peso(d.value)}</b>
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Monthly Net Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ['Gross Bill (all doctors)', peso(summary.grossBill)],
              ['Net Sales (after discounts, commission, fees)', peso(summary.netSales)],
              ['Doctor commissions (within Net Sales)', '− ' + peso(summary.doctorComm)],
              ['Staff payroll (gross, logged weeks)', '− ' + peso(summary.staffPayroll)],
              ['Net income after payroll', peso(summary.afterPayroll)],
              ['Clinic expenses', '− ' + peso(summary.expenses)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-dashed pb-1.5">
                <span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 text-base font-bold">
              <span>{summary.taxableNet > 0 ? 'Net Profit (Taxable)' : 'Net Deficit'}</span>
              <span className={summary.taxableNet > 0 ? '' : 'text-red-600'}>{peso(summary.taxableNet)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax section — auto Remaining Net Revenue + manual BIR entries */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Taxes — {month}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center rounded-lg border bg-muted/40 px-4 py-3">
            <span className="text-sm font-medium">
              {summary.taxableNet > 0 ? 'Net Profit — Taxable (auto from Monthly Net Summary)' : 'Net Deficit (auto from Monthly Net Summary)'}
            </span>
            <span className={`text-lg font-bold ${summary.taxableNet > 0 ? '' : 'text-red-600'}`}>
              {peso(summary.taxableNet)}
            </span>
          </div>
          {summary.taxableNet <= 0 && (
            <p className="text-sm font-semibold text-red-600">Unable to compute anymore Taxable amount</p>
          )}
          <p className="text-sm text-muted-foreground">
            <b>Paid Tax in month of {monthLabel}:</b>
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>BIR Tax (free text)</Label>
              <Input value={taxes.birTax} onChange={(e) => setTax('birTax', e.target.value)} placeholder="e.g. ₱ amount or note" />
            </div>
            <div className="space-y-1">
              <Label>Withholding Tax (free text)</Label>
              <Input value={taxes.withholdingTax} onChange={(e) => setTax('withholdingTax', e.target.value)} placeholder="e.g. ₱ amount or note" />
            </div>
            <div className="space-y-1">
              <Label>ITR (free text)</Label>
              <Input value={taxes.itr} onChange={(e) => setTax('itr', e.target.value)} placeholder="e.g. ₱ amount or note" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveTaxes}>Save Tax Entries</Button>
            {taxSavedFlash && <span className="text-sm text-emerald-600">Saved — system synced.</span>}
          </div>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-4 w-4" /> Bonus: BIR form links
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 rounded-lg border p-3">
              {BIR_LINKS.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-teal-700 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" /> {l.label}
                </a>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
