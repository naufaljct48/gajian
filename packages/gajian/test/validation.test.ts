import { expect, test } from 'vitest';
import { bpjs, getPtkp, getTerCategory, payslip, pph21Daily, pph21December, pph21Monthly } from '../src/index.js';

const ok = { gross: 10_000_000, status: 'TK/0', period: '2024-05' } as const;
const bad = (v: unknown) => v as never;

test.each([
  ['negative', -1, RangeError],
  ['non-integer', 1.5, RangeError],
  ['NaN', Number.NaN, RangeError],
  ['unsafe', 2 ** 53, RangeError],
  ['string', '1000', TypeError],
])('pph21Monthly gross %s -> %o', (_, gross, err) => {
  expect(() => pph21Monthly({ ...ok, gross: bad(gross) })).toThrow(err);
});

test('bad status', () => {
  expect(() => pph21Monthly({ ...ok, status: bad('K/4') })).toThrow(RangeError);
  expect(() => pph21Monthly({ ...ok, status: bad(1) })).toThrow(TypeError);
  expect(() => getTerCategory(bad('TK/9'))).toThrow(RangeError);
  expect(() => getPtkp(bad('k/0'), 2024)).toThrow(RangeError);
});

test('bad period format', () => {
  for (const period of ['2024-13', '2024-1', '2024-00', '24-01', '2024-01-01']) expect(() => pph21Monthly({ ...ok, period })).toThrow(RangeError);
  expect(() => pph21Monthly({ ...ok, period: bad(202401) })).toThrow(TypeError);
});

test('period before 2024-01: no TER rule applies', () => {
  expect(() => pph21Monthly({ ...ok, period: '2023-12' })).toThrow(/no TER bulanan rule applies/);
  expect(() => pph21Daily({ dailyGross: 500_000, period: '2023-12' })).toThrow(/no TER harian rule applies/);
  expect(() => payslip({ components: [{ label: 'Gaji', amount: 5_000_000, fixed: true }], status: 'TK/0', period: '2023-11', jkkClass: 'rendah' })).toThrow(RangeError);
});

test('pph21Daily validates dailyGross', () => {
  expect(() => pph21Daily({ dailyGross: -5, period: '2024-01' })).toThrow(RangeError);
  expect(() => pph21Daily({ dailyGross: 100.5, period: '2024-01' })).toThrow(RangeError);
});

test('pph21December validates money and year; 2023 has no PMK 168 biaya jabatan rule', () => {
  const base = { annualGross: 100_000_000, annualEmployeeJhtJp: 0, status: 'TK/0', year: 2024, taxWithheldJanNov: 0 } as const;
  expect(() => pph21December({ ...base, annualGross: -1 })).toThrow(RangeError);
  expect(() => pph21December({ ...base, annualEmployeeJhtJp: 0.5 })).toThrow(RangeError);
  expect(() => pph21December({ ...base, taxWithheldJanNov: bad('0') })).toThrow(TypeError);
  expect(() => pph21December({ ...base, year: 2024.5 })).toThrow(RangeError);
  expect(() => pph21December({ ...base, year: bad('2024') })).toThrow(TypeError);
  expect(() => pph21December({ ...base, year: 2023 })).toThrow(/no biaya jabatan rule applies/);
  expect(() => getPtkp('TK/0', 2015)).toThrow(/no PTKP rule applies/);
});

test('bpjs validates jkkClass and optional overrides', () => {
  const base = { wage: 5_000_000, period: '2025-01', jkkClass: 'rendah' } as const;
  expect(() => bpjs({ ...base, jkkClass: bad('medium') })).toThrow(RangeError);
  expect(() => bpjs({ ...base, wage: -1 })).toThrow(RangeError);
  expect(() => bpjs({ ...base, kesehatanFloor: -1 })).toThrow(RangeError);
  expect(() => bpjs({ ...base, jpWageCap: 1.5 })).toThrow(RangeError);
});

test('payslip validates components', () => {
  const base = { status: 'TK/0', period: '2025-01', jkkClass: 'rendah' } as const;
  expect(() => payslip({ ...base, components: [] })).toThrow(TypeError);
  expect(() => payslip({ ...base, components: [{ label: 'Gaji', amount: -1, fixed: true }] })).toThrow(RangeError);
  expect(() => payslip({ ...base, components: [{ label: 'Gaji', amount: 1, fixed: bad('yes') }] })).toThrow(TypeError);
  expect(() => payslip({ ...base, components: [{ label: bad(1), amount: 1, fixed: true }] })).toThrow(TypeError);
});
