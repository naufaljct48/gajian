import { expect, test } from 'vitest';
import { pph21December, pph21Monthly } from '../src/index.js';

test('PMK 168/2023 Lampiran C I.1 hlm. 61-62: Tuan A (PNS, K/1) December Rp619.065, end to end', () => {
  const grosses = [10_545_000, 10_281_000, 10_479_000, 10_017_000, 10_083_000, 20_034_000, 10_545_000, 10_281_000, 10_479_000, 10_347_000, 12_017_000, 10_413_000];
  const janNov = grosses.slice(0, 11).map((gross) => pph21Monthly({ gross, status: 'K/1', period: '2024-01' }).tax);
  const withheld = janNov.reduce((a, b) => a + b, 0);
  expect(withheld).toBe(3_359_085);
  const r = pph21December({
    annualGross: grosses.reduce((a, b) => a + b, 0),
    annualEmployeeJhtJp: 0, // the example deducts no iuran
    status: 'K/1',
    year: 2024,
    taxWithheldJanNov: withheld,
  });
  expect(r).toMatchObject({
    biayaJabatan: 6_000_000, // 5% x 135.521.000 = 6.776.050, capped
    netIncome: 129_521_000,
    ptkp: 63_000_000,
    pkp: 66_521_000,
    annualTax: 3_978_150, // 5% x 60.000.000 + 15% x 6.521.000
    decemberTax: 619_065,
    overpaid: 0,
  });
  expect(r.breakdown.find((l) => l.label.startsWith('Biaya jabatan'))!.rule).toMatch(/PMK 168\/2023 Pasal 10 ayat \(2\)/);
});

test('lebih bayar (hand-computed): TK/0, 9.000.000/month + 20.000.000 bonus in March', () => {
  // Jan-Nov TER (A): 10 x 1,75% x 9.000.000 = 1.575.000; March 12% x 29.000.000 = 3.480.000 -> 5.055.000
  const m = (gross: number) => pph21Monthly({ gross, status: 'TK/0', period: '2025-03' }).tax;
  const withheld = 10 * m(9_000_000) + m(29_000_000);
  expect(withheld).toBe(5_055_000);
  // bruto 12 x 9.000.000 + 20.000.000 = 128.000.000
  // biaya jabatan 5% = 6.400.000 -> cap 6.000.000
  // JHT 2% + JP 1% pegawai = 270.000 x 12 = 3.240.000
  // neto 128.000.000 - 6.000.000 - 3.240.000 = 118.760.000
  // PKP 118.760.000 - 54.000.000 = 64.760.000
  // tax 5% x 60.000.000 + 15% x 4.760.000 = 3.000.000 + 714.000 = 3.714.000
  // December 3.714.000 - 5.055.000 = -1.341.000 (lebih bayar)
  const r = pph21December({ annualGross: 128_000_000, annualEmployeeJhtJp: 3_240_000, status: 'TK/0', year: 2025, taxWithheldJanNov: withheld });
  expect(r).toMatchObject({ netIncome: 118_760_000, pkp: 64_760_000, annualTax: 3_714_000, decemberTax: -1_341_000, overpaid: 1_341_000 });
  expect(r.breakdown.at(-1)).toMatchObject({ amount: 1_341_000 });
  expect(r.breakdown.at(-1)!.rule).toMatch(/Pasal 21 ayat \(1\)/);
});

test('PKP is rounded down to the thousand (Pasal 8 ayat (4)), biaya jabatan 5% floored', () => {
  // biaya jabatan floor(5% x 100.000.999) = 5.000.049
  // neto 100.000.999 - 5.000.049 - 1.234.567 = 93.766.383; PKP 39.766.383 -> 39.766.000; tax 5% = 1.988.300
  const r = pph21December({ annualGross: 100_000_999, annualEmployeeJhtJp: 1_234_567, status: 'TK/0', year: 2024, taxWithheldJanNov: 1_988_300 });
  expect(r).toMatchObject({ biayaJabatan: 5_000_049, netIncome: 93_766_383, pkp: 39_766_000, annualTax: 1_988_300, decemberTax: 0, overpaid: 0 });
});

test('income below PTKP: PKP 0, no tax, withheld amount fully refunded', () => {
  // K/3: 60.000.000 - 3.000.000 = 57.000.000 < 72.000.000
  const r = pph21December({ annualGross: 60_000_000, annualEmployeeJhtJp: 0, status: 'K/3', year: 2024, taxWithheldJanNov: 10_000 });
  expect(r).toMatchObject({ pkp: 0, annualTax: 0, decemberTax: -10_000, overpaid: 10_000 });
});

test('all five Pasal 17 layers (hand-computed)', () => {
  // TK/0, bruto 6.060.000.000: biaya jabatan 6.000.000, PKP 6.060.000.000 - 6.000.000 - 54.000.000 = 6.000.000.000
  // 5% x 60jt + 15% x 190jt + 25% x 250jt + 30% x 4.500jt + 35% x 1.000jt
  // = 3.000.000 + 28.500.000 + 62.500.000 + 1.350.000.000 + 350.000.000 = 1.794.000.000
  const r = pph21December({ annualGross: 6_060_000_000, annualEmployeeJhtJp: 0, status: 'TK/0', year: 2024, taxWithheldJanNov: 0 });
  expect(r.pkp).toBe(6_000_000_000);
  expect(r.annualTax).toBe(1_794_000_000);
});
