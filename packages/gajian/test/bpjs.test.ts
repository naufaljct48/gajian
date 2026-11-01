import { expect, test } from 'vitest';
import { bpjs } from '../src/index.js';
import type { JkkRiskClass } from '../src/index.js';

test('JP cap: 2025-02 uses Rp10.042.300 (from 2024-03), 2025-03 uses Rp10.547.400, 2024-02 still the 2015 Rp7.000.000', () => {
  const jpAt = (period: string) => bpjs({ wage: 12_000_000, period, jkkClass: 'rendah' }).jp;
  expect(jpAt('2024-02')).toEqual({ base: 7_000_000, employer: 140_000, employee: 70_000 });
  expect(jpAt('2024-03')).toEqual({ base: 10_042_300, employer: 200_846, employee: 100_423 });
  expect(jpAt('2025-02')).toEqual({ base: 10_042_300, employer: 200_846, employee: 100_423 });
  expect(jpAt('2025-03')).toEqual({ base: 10_547_400, employer: 210_948, employee: 105_474 });
  expect(jpAt('2026-10')).toEqual({ base: 10_547_400, employer: 210_948, employee: 105_474 }); // no 2026 value loaded
});

test('JP cap override wins over rule data; wage below the cap is the base', () => {
  expect(bpjs({ wage: 12_000_000, period: '2025-06', jkkClass: 'rendah', jpWageCap: 11_000_000 }).jp.base).toBe(11_000_000);
  expect(bpjs({ wage: 9_000_000, period: '2025-06', jkkClass: 'rendah', jpWageCap: 11_000_000 }).jp.base).toBe(9_000_000);
  const r = bpjs({ wage: 12_000_000, period: '2025-06', jkkClass: 'rendah', jpWageCap: 11_000_000 });
  expect(r.breakdown.find((l) => l.label.startsWith('JP'))!.rule).toMatch(/override/);
});

test('Kesehatan: capped at Rp12.000.000; floor raises a low wage; floor above cap is capped', () => {
  expect(bpjs({ wage: 15_000_000, period: '2025-01', jkkClass: 'rendah' }).kesehatan).toEqual({ base: 12_000_000, employer: 480_000, employee: 120_000 });
  // 4% x 5.396.761 = 215.870,44 -> 215.870; 1% = 53.967,61 -> 53.967
  expect(bpjs({ wage: 3_000_000, period: '2025-01', jkkClass: 'rendah', kesehatanFloor: 5_396_761 }).kesehatan).toEqual({
    base: 5_396_761,
    employer: 215_870,
    employee: 53_967,
  });
  expect(bpjs({ wage: 8_000_000, period: '2025-01', jkkClass: 'rendah', kesehatanFloor: 5_396_761 }).kesehatan.base).toBe(8_000_000);
  expect(bpjs({ wage: 3_000_000, period: '2025-01', jkkClass: 'rendah', kesehatanFloor: 13_000_000 }).kesehatan.base).toBe(12_000_000);
  // The floor applies to Kesehatan only.
  expect(bpjs({ wage: 3_000_000, period: '2025-01', jkkClass: 'rendah', kesehatanFloor: 5_396_761 }).jht.base).toBe(3_000_000);
});

test.each([
  ['sangatRendah', 24_000],
  ['rendah', 54_000],
  ['sedang', 89_000],
  ['tinggi', 127_000],
  ['sangatTinggi', 174_000],
] as [JkkRiskClass, number][])('JKK %s on Rp10.000.000 = %i (employer only)', (jkkClass, employer) => {
  expect(bpjs({ wage: 10_000_000, period: '2025-01', jkkClass }).jkk).toEqual({ base: 10_000_000, employer, employee: 0 });
});

test('amounts round down: JKK sedang 0,89% x 3.333.333 = 29.666,66 -> 29.666', () => {
  expect(bpjs({ wage: 3_333_333, period: '2025-01', jkkClass: 'sedang' }).jkk.employer).toBe(29_666);
});

test('JHT, JKM and totals on Rp10.000.000 (2025-06, JKK rendah)', () => {
  const r = bpjs({ wage: 10_000_000, period: '2025-06', jkkClass: 'rendah' });
  expect(r.jht).toEqual({ base: 10_000_000, employer: 370_000, employee: 200_000 });
  expect(r.jkm).toEqual({ base: 10_000_000, employer: 30_000, employee: 0 });
  // employer 370.000 + 54.000 + 30.000 + 200.000 + 400.000; employee 200.000 + 100.000 + 100.000
  expect(r.totals).toEqual({ employer: 1_054_000, employee: 400_000 });
  expect(r.breakdown.every((l) => l.rule.length > 0 && Number.isSafeInteger(l.amount))).toBe(true);
});
