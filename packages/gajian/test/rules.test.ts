import { describe, expect, test } from 'vitest';
import * as rules from '../src/rules/index.js';
import type { Band, PtkpStatus, TerCategory } from '../src/rules/index.js';

const { terMonthly, terDaily, ptkp, terCategoryByStatus, pasal17, biayaJabatan, iuranPensiunDeduction } = rules;
const { jht, jkk, jkm, jp, jpWageCap, kesehatan } = rules;

// Test-only lookup ("sampai dengan" = inclusive top). The real lookup is task 3.
const rateFor = (bands: readonly Band[], gross: number) => bands.find((b) => b.upTo === null || gross <= b.upTo)?.rateBp;

function expectWellFormed(bands: readonly Band[], openEnded: boolean) {
  const tops = bands.map((b) => b.upTo);
  const closed = tops.filter((t): t is number => t !== null);
  expect(closed.every(Number.isSafeInteger)).toBe(true);
  for (let i = 1; i < closed.length; i++) expect(closed[i]).toBeGreaterThan(closed[i - 1]!); // ascending, no duplicates
  expect(tops.filter((t) => t === null).length).toBe(openEnded ? 1 : 0);
  if (openEnded) expect(tops.at(-1)).toBeNull();
  for (const b of bands) expect(Number.isInteger(b.rateBp)).toBe(true);
  for (let i = 1; i < bands.length; i++) expect(bands[i]!.rateBp).toBeGreaterThanOrEqual(bands[i - 1]!.rateBp);
}

describe.each(['A', 'B', 'C'] as const)('TER bulanan kategori %s', (cat) => {
  test('ascending upTo, no duplicates, one open-ended last band, integer non-decreasing rates', () => {
    expectWellFormed(terMonthly[cat], true);
  });
});

test('TER harian: ascending, closed at Rp2.500.000 (no open band in Lampiran D)', () => {
  expectWellFormed(terDaily.bands, false);
  expect(terDaily.aboveTable.baseBp).toBe(5000);
});

// Row counts as listed in PP 58/2023 Lampiran: A hlm. 1-5, B hlm. 6-10, C hlm. 10-14, D hlm. 15.
test('row counts: A 44, B 40, C 41, harian 2', () => {
  expect(terMonthly.A).toHaveLength(44);
  expect(terMonthly.B).toHaveLength(40);
  expect(terMonthly.C).toHaveLength(41);
  expect(terDaily.bands).toHaveLength(2);
});

// Rows as printed: "di atas Rp<from> sampai dengan Rp<upTo>" -> <rate>.
const printedRows: { cat: TerCategory; page: string; from: number | null; upTo: number | null; rateBp: number }[] = [
  { cat: 'A', page: 'hlm. 1', from: null, upTo: 5_400_000, rateBp: 0 },
  { cat: 'A', page: 'hlm. 2', from: 8_550_000, upTo: 9_650_000, rateBp: 175 },
  { cat: 'A', page: 'hlm. 3', from: 28_000_000, upTo: 30_050_000, rateBp: 1200 },
  { cat: 'A', page: 'hlm. 4', from: 89_000_000, upTo: 103_000_000, rateBp: 2400 },
  { cat: 'A', page: 'hlm. 5', from: 1_400_000_000, upTo: null, rateBp: 3400 },
  { cat: 'B', page: 'hlm. 6', from: null, upTo: 6_200_000, rateBp: 0 },
  { cat: 'B', page: 'hlm. 7', from: 12_600_000, upTo: 13_600_000, rateBp: 400 },
  { cat: 'B', page: 'hlm. 8', from: 53_800_000, upTo: 58_500_000, rateBp: 1900 },
  { cat: 'B', page: 'hlm. 9', from: 555_000_000, upTo: 704_000_000, rateBp: 3100 },
  { cat: 'B', page: 'hlm. 10', from: 1_405_000_000, upTo: null, rateBp: 3400 },
  { cat: 'C', page: 'hlm. 10', from: null, upTo: 6_600_000, rateBp: 0 },
  { cat: 'C', page: 'hlm. 11', from: 10_950_000, upTo: 11_200_000, rateBp: 175 },
  { cat: 'C', page: 'hlm. 12', from: 19_500_000, upTo: 22_700_000, rateBp: 800 },
  { cat: 'C', page: 'hlm. 13', from: 110_000_000, upTo: 134_000_000, rateBp: 2500 },
  { cat: 'C', page: 'hlm. 14', from: 965_000_000, upTo: 1_419_000_000, rateBp: 3300 },
  { cat: 'C', page: 'hlm. 14', from: 1_419_000_000, upTo: null, rateBp: 3400 },
];

test.each(printedRows)('PP 58/2023 Lampiran $page: kategori $cat, di atas $from s.d. $upTo = $rateBp bp', ({ cat, from, upTo, rateBp }) => {
  const bands = terMonthly[cat];
  const i = bands.findIndex((b) => b.upTo === upTo);
  expect(i).toBeGreaterThanOrEqual(0);
  expect(bands[i]!.rateBp).toBe(rateBp);
  expect(i === 0 ? null : bands[i - 1]!.upTo).toBe(from);
});

test('PP 58/2023 Lampiran hlm. 15: harian s.d. 450.000 = 0%, di atas 450.000 s.d. 2.500.000 = 0,5%', () => {
  expect(terDaily.bands).toEqual([
    { upTo: 450_000, rateBp: 0 },
    { upTo: 2_500_000, rateBp: 50 },
  ]);
});

// Worked examples in PMK 168/2023 Lampiran (gross bulanan, PTKP status, rate the example applies).
const pmkExamples: { page: string; status: PtkpStatus; gross: number; rateBp: number }[] = [
  { page: 'hlm. 36', status: 'TK/0', gross: 15_500_000, rateBp: 700 },
  { page: 'hlm. 39', status: 'TK/0', gross: 17_500_000, rateBp: 800 },
  { page: 'hlm. 40', status: 'TK/0', gross: 22_500_000, rateBp: 900 },
  { page: 'hlm. 44', status: 'TK/0', gross: 65_605_059, rateBp: 2100 },
  { page: 'hlm. 45', status: 'K/2', gross: 6_800_000, rateBp: 50 },
  // hlm. 46 prints "19% x Rp55.500.000" after stating gross Rp55.000.000; both fall in the 19% band.
  { page: 'hlm. 46', status: 'K/1', gross: 55_000_000, rateBp: 1900 },
  { page: 'hlm. 46-47', status: 'K/2', gross: 6_300_000, rateBp: 25 },
  { page: 'hlm. 61', status: 'K/1', gross: 10_545_000, rateBp: 150 },
  { page: 'hlm. 61', status: 'K/1', gross: 12_017_000, rateBp: 300 },
  { page: 'hlm. 61', status: 'K/1', gross: 20_034_000, rateBp: 800 },
  { page: 'hlm. 64', status: 'K/1', gross: 8_945_000, rateBp: 100 },
  { page: 'hlm. 64', status: 'K/1', gross: 17_090_000, rateBp: 700 },
  { page: 'hlm. 44', status: 'K/3', gross: 30_000_000, rateBp: 1100 },
  { page: 'hlm. 63', status: 'K/3', gross: 2_500_000, rateBp: 0 },
  { page: 'hlm. 63', status: 'K/3', gross: 5_000_000, rateBp: 0 },
];

test.each(pmkExamples)('PMK 168/2023 Lampiran $page: $status gross $gross -> $rateBp bp', ({ status, gross, rateBp }) => {
  expect(rateFor(terMonthly[terCategoryByStatus.map[status]], gross)).toBe(rateBp);
});

test('PMK 168/2023 Lampiran hlm. 48-49: harian 500.000 -> 0,5%, rata-rata 450.000 -> 0%', () => {
  expect(rateFor(terDaily.bands, 500_000)).toBe(50);
  expect(rateFor(terDaily.bands, 450_000)).toBe(0);
});

test('PTKP: PMK 101/PMK.010/2016 Pasal 1 amounts, every status = self + married + n x dependent', () => {
  expect([ptkp.self, ptkp.married, ptkp.perDependent, ptkp.maxDependents]).toEqual([54_000_000, 4_500_000, 4_500_000, 3]);
  for (const [status, amount] of Object.entries(ptkp.amounts)) {
    const [kind, n] = status.split('/') as [string, string];
    expect(amount).toBe(ptkp.self + (kind === 'K' ? ptkp.married : 0) + Number(n) * ptkp.perDependent);
  }
  expect(Object.keys(ptkp.amounts)).toHaveLength(8);
  expect(ptkp.amounts['K/3']).toBe(72_000_000); // also PMK 168/2023 Lampiran hlm. 63
});

test('TER category map: PP 58/2023 Pasal 2 ayat (4)', () => {
  expect(terCategoryByStatus.map).toEqual({
    'TK/0': 'A', 'TK/1': 'A', 'K/0': 'A',
    'TK/2': 'B', 'TK/3': 'B', 'K/1': 'B', 'K/2': 'B',
    'K/3': 'C',
  });
});

test('Pasal 17 ayat (1) huruf a (UU 7/2021 hlm. 56)', () => {
  expectWellFormed(pasal17.brackets, true);
  expect(pasal17.brackets).toEqual([
    { upTo: 60_000_000, rateBp: 500 },
    { upTo: 250_000_000, rateBp: 1500 },
    { upTo: 500_000_000, rateBp: 2500 },
    { upTo: 5_000_000_000, rateBp: 3000 },
    { upTo: null, rateBp: 3500 },
  ]);
});

test('biaya jabatan + iuran pensiun deduction: PMK 168/2023 Pasal 10', () => {
  expect(biayaJabatan).toMatchObject({ rateBp: 500, maxMonthly: 500_000, maxAnnual: 6_000_000 });
  expect(iuranPensiunDeduction.programs).toEqual(['JHT', 'JP']);
});

test('BPJS Ketenagakerjaan rates: PP 44/45/46 2015', () => {
  expect(jht).toMatchObject({ employerBp: 370, employeeBp: 200 });
  expect(jkk.employerBp).toEqual({ sangatRendah: 24, rendah: 54, sedang: 89, tinggi: 127, sangatTinggi: 174 });
  expect(jkm).toMatchObject({ employerBp: 30, employeeBp: 0 });
  expect(jp).toMatchObject({ employerBp: 200, employeeBp: 100 });
});

test.each([
  ['JP wage cap', jpWageCap],
  ['Kesehatan', kesehatan],
] as const)('%s history is ascending by effectiveFrom', (_, history) => {
  expect(history.length).toBeGreaterThan(0);
  for (let i = 1; i < history.length; i++) expect(history[i]!.effectiveFrom > history[i - 1]!.effectiveFrom).toBe(true);
});

test('JP cap 2015 = Rp7.000.000 (PP 45/2015 Pasal 29 ayat (2)); Kesehatan cap Rp12.000.000, 4% + 1%', () => {
  expect(jpWageCap[0]).toMatchObject({ effectiveFrom: '2015-07-01', cap: 7_000_000 });
  for (const k of kesehatan) expect(k).toMatchObject({ employerBp: 400, employeeBp: 100, wageCap: 12_000_000 });
});

// Every exported rule set is dated and cited, and no number anywhere in rules/ is a float.
const ruleSets = Object.values(rules).flatMap((v) => (Array.isArray(v) ? v : [v])) as { effectiveFrom: string; source: { regulation: string } }[];

test.each(ruleSets.map((r) => [r.source.regulation, r] as const))('%s: effectiveFrom is YYYY-MM-DD and cited', (_, r) => {
  expect(r.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(Number.isNaN(Date.parse(r.effectiveFrom))).toBe(false);
  expect(r.source.regulation.length).toBeGreaterThan(0);
});

test('all numbers in rules are safe integers', () => {
  const walk = (v: unknown): void => {
    if (typeof v === 'number') expect(Number.isSafeInteger(v)).toBe(true);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(rules);
});
