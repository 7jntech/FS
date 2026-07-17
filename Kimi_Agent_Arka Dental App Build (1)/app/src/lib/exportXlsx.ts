import * as XLSX from 'xlsx';
import type { AppState, Transaction } from '@/types';
import { fmtDate } from './calc';
import { peso } from './constants';

/** Build + download a 2-sheet Excel: Transaction Log + Expenses for the given month. */
export function exportMonthToExcel(state: AppState, month: string) {
  const wb = XLSX.utils.book_new();

  /* ---------- Sheet 1: Transaction Log ---------- */
  const tx = state.transactions
    .filter((t) => t.apptDate.startsWith(month))
    .sort((a, b) => a.apptDate.localeCompare(b.apptDate));

  const txHeaders = [
    'DMD_Name', 'Appt_Date', 'Patient_Name', 'Procedure_Type', 'Gross_Bill',
    'Discount_Type', 'Amount_Paid', 'Dentist_Comm_Pct', 'Payment_Mode',
    'Net_Income_After_Comm', 'Merchant_Fee', 'Net_Sales', 'Remarks',
  ];
  const txRows = tx.map((t: Transaction) => [
    t.dmdName,
    fmtDate(t.apptDate),
    t.patientName,
    t.procedureType,
    t.grossBill,
    t.discountType || '',
    t.amountPaid,
    t.dentistCommPct / 100,
    t.paymentMode,
    t.netIncomeAfterComm,
    t.merchantFee,
    t.netSales,
    t.remarks,
  ]);

  const txTotals = [
    'TOTALS', '', '', '',
    tx.reduce((s, t) => s + t.grossBill, 0),
    '',
    tx.reduce((s, t) => s + t.amountPaid, 0),
    '',
    '',
    tx.reduce((s, t) => s + t.netIncomeAfterComm, 0),
    tx.reduce((s, t) => s + t.merchantFee, 0),
    tx.reduce((s, t) => s + t.netSales, 0),
    `${tx.length} visit(s)`,
  ];

  const ws1 = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows, txTotals]);
  // column widths
  ws1['!cols'] = [
    { wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
    { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 13 }, { wch: 12 }, { wch: 18 },
  ];
  // currency formats (cols E, G, J, K, L) and percent (col H) on data rows
  const lastRow = 2 + txRows.length; // +1 header, +1 totals (1-indexed rows start at 2 for first data)
  for (let r = 2; r <= lastRow; r++) {
    ['E', 'G', 'J', 'K', 'L'].forEach((col) => {
      const cell = ws1[`${col}${r}`];
      if (cell && typeof cell.v === 'number') cell.z = '₱#,##0.00';
    });
    const pct = ws1[`H${r}`];
    if (pct && typeof pct.v === 'number') pct.z = '0%';
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Transaction Log');

  /* ---------- Sheet 2: Expenses ---------- */
  const exp = state.expenses.filter((e) => e.month === month);
  const expHeaders = ['Month', 'Category', 'Item', 'Amount', 'Note'];
  const expRows = exp.map((e) => [e.month, e.label.split(' — ')[0], e.label, e.amount, e.note]);
  const expTotal = ['TOTAL', '', '', exp.reduce((s, e) => s + e.amount, 0), ''];

  const ws2 = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows, expTotal]);
  ws2['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 44 }, { wch: 14 }, { wch: 24 }];
  const lastRow2 = 2 + expRows.length;
  for (let r = 2; r <= lastRow2; r++) {
    const cell = ws2[`D${r}`];
    if (cell && typeof cell.v === 'number') cell.z = '₱#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, ws2, 'Expenses');

  /* ---------- Download ---------- */
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ArkaDental_${month}_Transactions+Expenses.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { txCount: tx.length, expCount: exp.length, totalNet: peso(txTotals[11] as number) };
}
