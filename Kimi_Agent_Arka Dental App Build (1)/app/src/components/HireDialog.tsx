import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp, uid } from '@/lib/store';
import { iso } from '@/lib/calc';

const empty = {
  name: '', tin: '', contact: '', emergencyContact: '', email: '',
  dob: '', address: '', hiredDate: iso(new Date()), schedule: '', dailyRate: '615',
};

export default function HireDialog({ kind, trigger }: { kind: 'staff' | 'doctor'; trigger: React.ReactNode }) {
  const [, setState] = useApp();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    if (!f.name.trim()) return;
    const id = uid();
    setState((s) => {
      let doctors = s.doctors;
      let doctorCode: string | undefined;
      if (kind === 'doctor') {
        const initials = f.name.replace(/^Dr\.?\s*/i, '').split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 3);
        doctorCode = initials;
        let n = 2;
        while (s.doctors.some((d) => d.code === doctorCode)) doctorCode = initials + n++;
        doctors = [...s.doctors, { code: doctorCode, name: f.name.trim() }];
      }
      return {
        ...s,
        doctors,
        employees: [
          ...s.employees,
          {
            id, kind,
            name: f.name.trim(), tin: f.tin.trim(), contact: f.contact.trim(),
            emergencyContact: f.emergencyContact.trim(), email: f.email.trim(),
            dob: f.dob, address: f.address.trim(), hiredDate: f.hiredDate,
            schedule: f.schedule.trim() || 'NA',
            dailyRate: Number(f.dailyRate) || 0,
            doctorCode,
            applyDeductions: true,
          },
        ],
      };
    });
    setF(empty);
    setOpen(false);
  };

  const fields: { key: keyof typeof empty; label: string; type?: string; hide?: boolean }[] = [
    { key: 'name', label: 'Name' },
    { key: 'tin', label: 'TIN I.D' },
    { key: 'contact', label: 'Contact #' },
    { key: 'emergencyContact', label: 'Emergency Contact #' },
    { key: 'email', label: 'Email Address', type: 'email' },
    { key: 'dob', label: 'Date of Birth', type: 'date' },
    { key: 'dailyRate', label: 'Daily Rate (₱)', hide: kind === 'doctor' },
    { key: 'address', label: 'Current Address' },
    { key: 'hiredDate', label: 'Hired Date', type: 'date' },
    { key: 'schedule', label: 'Schedule (optional/NA)' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{kind === 'doctor' ? 'New Hire — Doctor' : 'New Hire — Employee'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {fields.filter((x) => !x.hide).map((x) => (
            <div key={x.key} className="space-y-1">
              <Label>{x.label}</Label>
              <Input type={x.type ?? 'text'} value={f[x.key]} onChange={set(x.key)} />
            </div>
          ))}
        </div>
        <Button className="mt-4 w-full" onClick={submit} disabled={!f.name.trim()}>Submit</Button>
      </DialogContent>
    </Dialog>
  );
}
