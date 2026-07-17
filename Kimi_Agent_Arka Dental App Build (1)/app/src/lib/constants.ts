export const COMPANY = {
  name: 'Arka Dental Center',
  address: 'Unit L519 (5th Floor), One Oasis Condominium Hub A, Ortigas Extension, Pasig City, Metro Manila',
};

export interface Doctor {
  code: string;
  name: string;
}

export const DEFAULT_DOCTORS: Doctor[] = [
  { code: 'ER', name: 'Dr. Eugine Francis Romero' },
  { code: 'GA', name: 'Dr. Giselle Abrogena' },
  { code: 'KU', name: 'Dr. Karla Antonette Urbi' },
];

/** Procedure type -> standard gross bill (PHP) */
export const DEFAULT_PROCEDURES: { name: string; price: number }[] = [
  { name: 'Con/Op', price: 1500 },
  { name: 'Op', price: 1000 },
  { name: 'Con/Op/LC', price: 800 },
  { name: 'Con/Exo/Xray', price: 1300 },
  { name: 'Con/Exo/Xray/Lido', price: 1600 },
  { name: 'Con/Resto', price: 2400 },
  { name: 'Acrylic Denture', price: 4000 },
  { name: 'Adjust', price: 1500 },
  { name: 'Con/Op/EXO', price: 300 },
  { name: 'Con/EXO/LC', price: 1100 },
  { name: 'Braces Removal', price: 4000 },
  { name: 'EXO', price: 800 },
  { name: 'Con/LC/Op', price: 800 },
  { name: 'Resto', price: 2400 },
  { name: 'Op/Resto/Xray', price: 4700 },
  { name: 'Odontect', price: 2000 },
  { name: 'Resto/Exo', price: 4200 },
  { name: 'Op/Resto', price: 3200 },
  { name: 'Strap Up', price: 5000 },
  { name: 'Con/OP/LC/Flouride', price: 800 },
  { name: 'TE', price: 500 },
  { name: 'Xray', price: 1200 },
];

export const DISCOUNT_TYPES = [
  'Senior Citizen (20%)',
  'PWD (20%)',
  'DMD Discount',
  'Monthly Promo',
  'Corporate/HMO',
  'Other',
] as const;

export const COMM_PCT_OPTIONS = [10, 20, 30, 40];

export const PAYMENT_MODES = [
  'Cash',
  'Gcash',
  'Gcash (via Terminal)',
  'Pay Maya',
  'Maya QR (QRPh)',
  'Debit Card',
  'CC BPI',
  'CC Union',
  'CC Security',
  'Other CC',
  'HMO Covered',
  'GoTyme Bank',
] as const;

/** Merchant Discount Rate (MDR) per payment mode — terminal merchant fees */
export const MERCHANT_FEE_RATES: Record<string, number> = {
  // Credit cards (Visa/Mastercard) — 3.5% MDR
  'Debit Card': 0.035,
  'CC BPI': 0.035,
  'CC Union': 0.035,
  'CC Security': 0.035,
  'Other CC': 0.035,
  // E-wallets via terminal — 2.0% MDR
  'Gcash': 0.02,
  'Gcash (via Terminal)': 0.02,
  // QRPh / Maya QR national standard — 1.5% MDR
  'Pay Maya': 0.015,
  'Maya QR (QRPh)': 0.015,
};

export const mdrLabel = (mode: string) => {
  const r = MERCHANT_FEE_RATES[mode];
  return r ? `${(r * 100).toFixed(1)}% MDR` : 'no fee';
};

export interface ExpenseItem {
  label: string;
  price: number | null; // null = blank, admin fills in
}

export const EXPENSE_CATEGORIES: { key: string; label: string; hint: string; items: ExpenseItem[] }[] = [
  {
    key: 'rent',
    label: 'Rent & Utilities',
    hint: 'Fixed monthly bills',
    items: [
      { label: 'Rent (70sqm)', price: 18000 },
      { label: 'Electric Bill', price: null },
      { label: 'Wifi', price: 1399 },
      { label: 'Mobile Bill', price: null },
    ],
  },
  {
    key: 'supplies',
    label: 'Dental Supplies',
    hint: 'Typically 4%–7% of gross. SPMS bundle promo ₱6,900 vs ₱11,300 retail value.',
    items: [
      { label: 'SPMS Bundle Promo (Beautifil 6-Color Set + 4 syringes)', price: 6900 },
      { label: 'Beautifil A1 Syringe (single)', price: 1350 },
      { label: 'Beautifil A2 Syringe (single)', price: 1350 },
      { label: 'Beautifil A3 Syringe (single)', price: 1350 },
      { label: 'Beautifil XSL A2 Syringe (single)', price: 1450 },
      { label: 'Super Floss', price: 280 },
      { label: 'Chair', price: 11250 },
    ],
  },
  {
    key: 'lab',
    label: 'Laboratory Fees',
    hint: 'Typically 6%–10% (outsourced dentures, crowns, braces)',
    items: [],
  },
  {
    key: 'misc',
    label: 'Miscellaneous',
    hint: 'Office & clinic sundries',
    items: [
      { label: 'Water', price: null },
      { label: 'Medical', price: null },
      { label: 'Marker', price: null },
      { label: 'HP Ink', price: null },
      { label: 'Grocery', price: null },
      { label: 'Super Floss', price: 280 },
      { label: 'Laundry', price: null },
      { label: 'Sabon', price: null },
      { label: 'Ballpen', price: null },
      { label: 'Grab', price: null },
      { label: 'Alcohol', price: null },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing, Tech, Permits',
    hint: 'Typically 10%–15% — optional',
    items: [{ label: 'Ads', price: 12000 }],
  },
  {
    key: 'food',
    label: 'Employees Food',
    hint: 'Meals for staff',
    items: [],
  },
];

export const ATTENDANCE_STATUS = ['At-Work', 'Absent', 'VL', 'SL'] as const;
export const HOLIDAY_RULES = ['130%', '200%', 'No work no pay', 'PH-HL Paid leave'] as const;

export const DEFAULT_STAFF = [
  { name: 'Marylo Millares', code: 'MM', dailyRate: 600 },
  { name: 'Rheinn Arkin Imperial', code: 'RA', dailyRate: 610 },
  { name: 'Ryan Bolonia', code: 'RB', dailyRate: 610 },
  { name: 'Mikha', code: 'MK', dailyRate: 650 },
  { name: 'Anna', code: 'AN', dailyRate: 700 },
];

/** Weekly deduction defaults (per week) */
export const DEFAULT_PAGIBIG_WK = 50;
export const DEFAULT_SSS_WK = 180;

/** 2026 Philippine regular & special non-working holidays (MM-DD) */
export const PH_HOLIDAYS_2026: Record<string, { name: string; type: 'regular' | 'special' }> = {
  '01-01': { name: "New Year's Day", type: 'regular' },
  '04-02': { name: 'Maundy Thursday', type: 'regular' },
  '04-03': { name: 'Good Friday', type: 'regular' },
  '04-09': { name: 'Araw ng Kagitingan', type: 'regular' },
  '05-01': { name: 'Labor Day', type: 'regular' },
  '06-12': { name: 'Independence Day', type: 'regular' },
  '08-31': { name: 'National Heroes Day', type: 'regular' },
  '11-30': { name: 'Bonifacio Day', type: 'regular' },
  '12-25': { name: 'Christmas Day', type: 'regular' },
  '12-30': { name: 'Rizal Day', type: 'regular' },
  '02-17': { name: 'Chinese New Year', type: 'special' },
  '04-04': { name: 'Black Saturday', type: 'special' },
  '08-21': { name: 'Ninoy Aquino Day', type: 'special' },
  '11-01': { name: "All Saints' Day", type: 'special' },
  '12-08': { name: 'Feast of the Immaculate Conception', type: 'special' },
  '12-24': { name: 'Christmas Eve', type: 'special' },
  '12-31': { name: "New Year's Eve", type: 'special' },
};

export const DELETE_CONFIRM_PHRASE = 'Sure na Sure na Sure na Arka Dental Center';

export const peso = (n: number) =>
  '₱' + (isFinite(n) ? n : 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
