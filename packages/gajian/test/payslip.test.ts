import { expect, test } from 'vitest';
import { payslip } from '../src/index.js';

const components = [
  { label: 'Gaji pokok', amount: 8_000_000, fixed: true },
  { label: 'Tunjangan jabatan', amount: 2_000_000, fixed: true },
  { label: 'Lembur', amount: 1_500_000, fixed: false },
];

test('full payslip: K/1, June 2025, JKK rendah', () => {
  // BPJS wage = 8.000.000 + 2.000.000 = 10.000.000 (lembur is not fixed)
  //   JHT 3,7% / 2%      -> 370.000 / 200.000
  //   JKK rendah 0,54%   -> 54.000
  //   JKM 0,30%          -> 30.000
  //   JP base min(10.000.000, 10.547.400) -> 2% / 1% = 200.000 / 100.000
  //   Kesehatan base 10.000.000 -> 4% / 1% = 400.000 / 100.000
  //   employee total 400.000
  // TER gross = 11.500.000 + 54.000 + 30.000 + 400.000 = 11.984.000
  // K/1 -> kategori B; 11.600.000 < 11.984.000 <= 12.600.000 -> 3% -> PPh 21 359.520
  // take-home = 11.500.000 - 400.000 - 359.520 = 10.740.480
  const r = payslip({ components, status: 'K/1', period: '2025-06', jkkClass: 'rendah' });
  expect(r.bpjs.totals).toEqual({ employer: 1_054_000, employee: 400_000 });
  expect(r.gross).toBe(11_984_000);
  expect(r.pph21).toMatchObject({ category: 'B', rateBp: 300, tax: 359_520 });
  expect(r.takeHome).toBe(10_740_480);
  expect(r.breakdown.at(-1)).toMatchObject({ amount: 10_740_480 });
  expect(r.breakdown.find((l) => l.label.startsWith('Penghasilan bruto'))!.amount).toBe(11_984_000);
  expect(r.breakdown.every((l) => l.rule.length > 0 && Number.isSafeInteger(l.amount))).toBe(true);
});

test('payslip passes kesehatanFloor and jpWageCap through to bpjs', () => {
  const r = payslip({
    components: [{ label: 'Gaji pokok', amount: 4_000_000, fixed: true }],
    status: 'TK/0',
    period: '2025-01',
    jkkClass: 'rendah',
    kesehatanFloor: 5_396_761,
    jpWageCap: 3_000_000,
  });
  expect(r.bpjs.kesehatan.base).toBe(5_396_761);
  expect(r.bpjs.jp.base).toBe(3_000_000);
});

test('December throws and points to pph21December', () => {
  expect(() => payslip({ components, status: 'K/1', period: '2025-12', jkkClass: 'rendah' })).toThrow(/pph21December/);
});
