import { useCallback, useSyncExternalStore } from 'react';
import type { AppState, Employee } from '@/types';
import { DEFAULT_DOCTORS, DEFAULT_PROCEDURES, DEFAULT_STAFF } from './constants';

const KEY = 'arka-dental-state-v1';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const newStaff = (def: { name: string; code: string; dailyRate: number }): Employee => ({
  id: uid(),
  kind: 'staff',
  name: def.name,
  staffCode: def.code,
  tin: '',
  contact: '',
  emergencyContact: '',
  email: '',
  dob: '',
  address: '',
  hiredDate: '',
  schedule: 'Mon–Sat, 8 hrs (lunch not paid)',
  dailyRate: def.dailyRate,
  applyDeductions: true,
});

function seed(): AppState {
  return {
    transactions: [],
    expenses: [],
    employees: DEFAULT_STAFF.map(newStaff),
    attendance: [],
    incentives: {},
    weekly: {},
    doctors: DEFAULT_DOCTORS,
    procedures: DEFAULT_PROCEDURES,
    payroll: {
      deductionSplit: 'split',
      doctorCutoffDay1: 15,
      doctorDisbursementDate: '',
      locked: false,
    },
    taxes: {},
  };
}

let state: AppState = load();
const listeners = new Set<() => void>();

/** Align stored staff with the canonical roster (names, codes, daily rates); keep other records. */
function migrate(s: AppState): AppState {
  const staff = s.employees.filter((e) => e.kind === 'staff');
  const others = s.employees.filter((e) => e.kind !== 'staff');
  const migrated = DEFAULT_STAFF.map((def) => {
    const old = staff.find(
      (e) => e.name === def.name || e.name.startsWith(def.name.split(' ')[0]),
    );
    return old
      ? { ...old, name: def.name, staffCode: def.code, dailyRate: def.dailyRate }
      : newStaff(def);
  });
  return {
    ...s,
    weekly: s.weekly ?? {},
    taxes: s.taxes ?? {},
    employees: [...migrated, ...others],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate({ ...seed(), ...JSON.parse(raw) });
  } catch {
    /* corrupted storage -> reseed */
  }
  return seed();
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  return state;
}

export function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  persist();
}

export function useApp(): [AppState, (u: (s: AppState) => AppState) => void] {
  const s = useSyncExternalStore(
    useCallback((cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }, []),
    getState,
  );
  return [s, setState];
}

export { uid };
