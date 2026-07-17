import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/lib/store';
import { DELETE_CONFIRM_PHRASE } from '@/lib/constants';

/** Red-letters delete block fixed at the very bottom of payroll sections. */
export default function DeleteRecords({ kind }: { kind: 'staff' | 'doctor' }) {
  const [state, setState] = useApp();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [typed, setTyped] = useState('');

  const people = state.employees.filter((e) => e.kind === kind);
  const match = typed.trim() === DELETE_CONFIRM_PHRASE;

  const doDelete = () => {
    if (!match || !target) return;
    setState((s) => {
      const emp = s.employees.find((e) => e.id === target);
      return {
        ...s,
        employees: s.employees.filter((e) => e.id !== target),
        attendance: s.attendance.filter((a) => a.employeeId !== target),
        doctors: emp?.kind === 'doctor'
          ? s.doctors.filter((d) => d.name !== emp.name)
          : s.doctors,
      };
    });
    setOpen(false);
    setTarget('');
    setTyped('');
  };

  return (
    <div className="mt-10 border-t pt-4 pb-2 text-center">
      <button
        className="text-red-600 font-bold tracking-wide hover:underline"
        onClick={() => setOpen(true)}
      >
        Delete records
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete {kind === 'doctor' ? 'Doctor' : 'Employee'} Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue placeholder="Select record to delete" /></SelectTrigger>
              <SelectContent>
                {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              To proceed, type: <b className="text-red-600">"{DELETE_CONFIRM_PHRASE}"</b>
            </p>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type the confirmation phrase" />
            <Button variant="destructive" className="w-full" disabled={!match || !target} onClick={doDelete}>
              Proceed — system deletes record & auto refresh
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
