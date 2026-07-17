import { useState } from 'react';
import { ReceiptText, Wallet, Stethoscope, Users } from 'lucide-react';
import { COMPANY } from '@/lib/constants';
import TransactionLog from '@/sections/TransactionLog';
import Expenses from '@/sections/Expenses';
import DoctorPayroll from '@/sections/DoctorPayroll';
import EmployeePayroll from '@/sections/EmployeePayroll';

const TABS = [
  { key: 'log', label: 'Transaction Log', icon: ReceiptText },
  { key: 'expenses', label: 'Expenses', icon: Wallet },
  { key: 'doctors', label: 'Dentist Commission', icon: Stethoscope },
  { key: 'staff', label: 'Employee Payroll', icon: Users },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function App() {
  const [tab, setTab] = useState<TabKey>('log');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-teal-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-xl font-bold tracking-wide">{COMPANY.name}</h1>
          <p className="text-xs text-teal-200">{COMPANY.address}</p>
        </div>
        <nav className="mx-auto max-w-7xl px-4 flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                tab === key ? 'bg-slate-50 text-teal-900' : 'text-teal-100 hover:bg-teal-700'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === 'log' && <TransactionLog />}
        {tab === 'expenses' && <Expenses />}
        {tab === 'doctors' && <DoctorPayroll />}
        {tab === 'staff' && <EmployeePayroll />}
      </main>
    </div>
  );
}
