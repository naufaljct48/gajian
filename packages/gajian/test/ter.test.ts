import { describe, expect, test } from 'vitest';
import { getPtkp, getTerCategory, pph21Daily, pph21Monthly, rules } from '../src/index.js';
import type { PtkpStatus } from '../src/index.js';

const { terMonthly } = rules;
const statusFor = { A: 'TK/0', B: 'TK/2', C: 'K/3' } as const;

describe.each(['A', 'B', 'C'] as const)('TER bulanan kategori %s: every band boundary (generated from rule data)', (cat) => {
  const bands = terMonthly[cat];
  const cases = bands.flatMap((b, i) => (b.upTo === null ? [] : [{ i, upTo: b.upTo, rateBp: b.rateBp, nextBp: bands[i + 1]!.rateBp }]));
  test.each(cases)('band $i: $upTo - 1 and $upTo -> $rateBp bp; $upTo + 1 -> $nextBp bp', ({ upTo, rateBp, nextBp }) => {
    const status = statusFor[cat];
    for (const [gross, bp] of [[upTo - 1, rateBp], [upTo, rateBp], [upTo + 1, nextBp]] as const) {
      const r = pph21Monthly({ gross, status, period: '2024-01' });
      expect(r.category).toBe(cat);
      expect(r.rateBp).toBe(bp);
      expect(r.tax).toBe(Math.floor((gross * bp) / 10000));
      expect(Number.isSafeInteger(r.tax)).toBe(true);
    }
  });
});

test('TER tax is rounded down to whole rupiah: 5.400.001 x 0,25% = 13.500,0025 -> 13.500', () => {
  expect(pph21Monthly({ gross: 5_400_001, status: 'TK/0', period: '2024-06' }).tax).toBe(13_500);
});

test('pph21Monthly breakdown cites PP 58/2023 and PMK 168/2023 Pasal 15', () => {
  const r = pph21Monthly({ gross: 10_000_000, status: 'K/0', period: '2025-01' });
  expect(r.breakdown.at(-1)).toMatchObject({ amount: r.tax });
  expect(r.breakdown.at(-1)!.rule).toMatch(/PP 58\/2023 Pasal 2 ayat \(5\).*PMK 168\/2023 Pasal 15 ayat \(1\) huruf a/);
});

// PMK 101/PMK.010/2016 Pasal 1; PP 58/2023 Pasal 2 ayat (4).
const statuses: [PtkpStatus, 'A' | 'B' | 'C', number][] = [
  ['TK/0', 'A', 54_000_000],
  ['TK/1', 'A', 58_500_000],
  ['TK/2', 'B', 63_000_000],
  ['TK/3', 'B', 67_500_000],
  ['K/0', 'A', 58_500_000],
  ['K/1', 'B', 63_000_000],
  ['K/2', 'B', 67_500_000],
  ['K/3', 'C', 72_000_000],
];
test.each(statuses)('%s -> kategori %s, PTKP %i', (status, cat, amount) => {
  expect(getTerCategory(status)).toBe(cat);
  const p = getPtkp(status, 2025);
  expect(p.amount).toBe(amount);
  expect(p.breakdown.reduce((s, l) => s + l.amount, 0)).toBe(amount);
  expect(p.breakdown.every((l) => l.rule.startsWith('PMK 101/PMK.010/2016'))).toBe(true);
});

// --- PMK 168/2023 Lampiran worked examples (page = printed page of the JDIH PDF) ---

test('PMK 168/2023 Lampiran B I.1 hlm. 34: Tuan A (K/0) monthly TER, Jan-Nov withheld Rp50.120.000', () => {
  const m = (gross: number) => pph21Monthly({ gross, status: 'K/0', period: '2024-01' });
  expect([m(30_080_000).rateBp, m(30_080_000).tax]).toEqual([1300, 3_910_400]);
  expect([m(35_080_000).rateBp, m(35_080_000).tax]).toEqual([1400, 4_911_200]);
  expect([m(50_080_000).rateBp, m(50_080_000).tax]).toEqual([1800, 9_014_400]);
  // Jan-Nov: 8 months of 30.080.000, 2 of 35.080.000, 1 of 50.080.000.
  expect(8 * m(30_080_000).tax + 2 * m(35_080_000).tax + m(50_080_000).tax).toBe(50_120_000);
});

test.each([
  { page: 'hlm. 36 (Tuan B)', status: 'TK/0', gross: 15_500_000, tax: 1_085_000 },
  { page: 'hlm. 39 (Tuan D)', status: 'TK/0', gross: 17_500_000, tax: 1_400_000 },
  { page: 'hlm. 40 (Tuan D, PT AB)', status: 'TK/0', gross: 22_500_000, tax: 2_025_000 },
  { page: 'hlm. 44 (Tuan F)', status: 'K/3', gross: 30_000_000, tax: 3_300_000 },
  // 21% x 65.605.059 = 13.777.062,39: the Lampiran rounds down.
  { page: 'hlm. 44 (Tuan G)', status: 'TK/0', gross: 65_605_059, tax: 13_777_062 },
  { page: 'hlm. 45 (Tuan H)', status: 'K/2', gross: 6_800_000, tax: 34_000 },
] as const)('PMK 168/2023 Lampiran B $page: $status gross $gross -> PPh 21 $tax', ({ status, gross, tax }) => {
  expect(pph21Monthly({ gross, status, period: '2024-08' }).tax).toBe(tax);
});

test.each([
  {
    page: 'hlm. 61 (Tuan A, K/1)',
    grosses: [10_545_000, 10_281_000, 10_479_000, 10_017_000, 10_083_000, 20_034_000, 10_545_000, 10_281_000, 10_479_000, 10_347_000, 12_017_000],
    total: 3_359_085,
  },
  {
    page: 'hlm. 64-65 (Tuan C, K/1)',
    grosses: [8_945_000, 8_845_000, 8_445_000, 8_495_000, 8_645_000, 17_090_000, 8_945_000, 8_495_000, 8_795_000, 8_945_000, 8_645_000],
    total: 2_068_300,
  },
])('PMK 168/2023 Lampiran C $page: Jan-Nov TER withheld = $total', ({ grosses, total }) => {
  const taxes = grosses.map((gross, i) => pph21Monthly({ gross, status: 'K/1', period: `2024-${String(i + 1).padStart(2, '0')}` }).tax);
  expect(taxes.reduce((a, b) => a + b, 0)).toBe(total);
});

test('PMK 168/2023 Lampiran B IV.1.1 hlm. 48: Tuan K, harian Rp500.000 -> 0,5% = Rp2.500', () => {
  expect(pph21Daily({ dailyGross: 500_000, period: '2024-01' })).toMatchObject({ method: 'TER harian', rateBp: 50, tax: 2_500 });
});

test('PMK 168/2023 Lampiran B IV.1.2 hlm. 49: Tuan L, borongan 4.500.000 / 10 hari = 450.000 -> 0%', () => {
  expect(pph21Daily({ dailyGross: 4_500_000 / 10, period: '2024-06' })).toMatchObject({ rateBp: 0, tax: 0 });
});

test('PMK 168/2023 Lampiran B IV.1.3 hlm. 49-50: Tuan M, Rp3.000.000 sehari -> 5% x 50% x 3.000.000 = Rp75.000', () => {
  const r = pph21Daily({ dailyGross: 3_000_000, period: '2024-01' });
  expect(r).toMatchObject({ method: 'Pasal 17', rateBp: null, base: 1_500_000, tax: 75_000 });
  expect(r.breakdown.at(-1)!.rule).toMatch(/UU 7\/2021.*PMK 168\/2023 Pasal 16 ayat \(2\) huruf b/);
});

test('PMK 168/2023 Lampiran B IV.1.4 hlm. 50: Tuan Z, 15.000.000 / 5 hari -> Rp75.000 sehari, Rp375.000 total', () => {
  expect(5 * pph21Daily({ dailyGross: 15_000_000 / 5, period: '2024-01' }).tax).toBe(375_000);
});

test('harian boundary: Rp2.500.000 uses TER 0,5%; Rp2.500.001 uses Pasal 17 on 50% (floored to 1.250.000)', () => {
  expect(pph21Daily({ dailyGross: 2_500_000, period: '2024-01' })).toMatchObject({ method: 'TER harian', tax: 12_500 });
  expect(pph21Daily({ dailyGross: 2_500_001, period: '2024-01' })).toMatchObject({ method: 'Pasal 17', base: 1_250_000, tax: 62_500 });
});

test('harian above Rp120.000.000: 50% base crosses the first Pasal 17 layer', () => {
  // base 75.000.000: 5% x 60.000.000 + 15% x 15.000.000 = 3.000.000 + 2.250.000
  expect(pph21Daily({ dailyGross: 150_000_000, period: '2024-01' }).tax).toBe(5_250_000);
});
