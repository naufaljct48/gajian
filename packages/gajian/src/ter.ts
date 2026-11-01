import { pasal17, terDaily, terMonthly } from './rules/index.js';
import type { PtkpStatus, TerCategory } from './rules/index.js';
import { getTerCategory } from './ptkp.js';
import { applyBp, assertMoney, bandFor, cite, pct, periodStart, progressive, rp, ruleAt } from './util.js';
import type { Explained } from './util.js';

const PMK168 = 'PMK 168/2023';

export interface Pph21MonthlyInput {
  /**
   * Full monthly penghasilan bruto of a Pegawai Tetap, integer rupiah (PMK 168/2023 Pasal 8 ayat (2)
   * huruf a). It includes salary, every allowance, overtime, bonus/THR and other irregular pay
   * (Pasal 5 ayat (3) huruf a-b) AND the employer-paid BPJS JKK, JKM and BPJS Kesehatan iuran
   * (Pasal 5 ayat (3) huruf d-e). It excludes employer-paid JHT and JP iuran (Pasal 7 huruf c).
   * Employee-paid iuran are NOT subtracted (Lampiran B I.5, Tuan H).
   */
  gross: number;
  status: PtkpStatus;
  /**
   * 'YYYY-MM'. Any month is accepted (TER bulanan also applies in December to e.g. komisaris paid
   * irregularly, Pasal 16 ayat (1)); a Pegawai Tetap's December is `pph21December`.
   */
  period: string;
}

export interface Pph21MonthlyResult extends Explained {
  category: TerCategory;
  rateBp: number;
  tax: number;
}

/**
 * Monthly PPh 21 for a Pegawai Tetap in a Masa Pajak other than the last one:
 * TER bulanan (PP 58/2023 Lampiran A-C) x gross (PMK 168/2023 Pasal 15 ayat (1) huruf a).
 * tax = floor(gross x rateBp / 10000), rounded down to whole rupiah.
 * Throws RangeError for a period before the first TER rule (2024-01).
 */
export function pph21Monthly({ gross, status, period }: Pph21MonthlyInput): Pph21MonthlyResult {
  assertMoney('gross', gross);
  const category = getTerCategory(status);
  const rule = ruleAt([terMonthly], periodStart(period), 'TER bulanan');
  const { rateBp } = bandFor(rule[category], gross)!; // monthly tables end open-ended
  const tax = applyBp(gross, rateBp);
  return {
    category,
    rateBp,
    tax,
    breakdown: [
      { label: 'Penghasilan bruto sebulan', amount: gross, rule: `${PMK168} Pasal 5 ayat (3); Pasal 8 ayat (2) huruf a` },
      {
        label: `PPh 21 = TER kategori ${category} ${pct(rateBp)} x ${rp(gross)}`,
        amount: tax,
        rule: `${cite(rule.source)}; ${PMK168} Pasal 15 ayat (1) huruf a`,
      },
    ],
  };
}

export interface Pph21DailyInput {
  /**
   * Penghasilan bruto sehari of a Pegawai Tidak Tetap paid other than monthly, integer rupiah: the
   * day's pay, or for upah borongan/satuan the average per day worked (total / days; PMK 168/2023
   * Pasal 12 ayat (2) huruf a, Lampiran B Bagian Pertama III.1 angka 4). Divide before calling.
   */
  dailyGross: number;
  period: string;
}

export interface Pph21DailyResult extends Explained {
  /** 'TER harian' up to Rp2.500.000 a day; 'Pasal 17' above it. */
  method: 'TER harian' | 'Pasal 17';
  /** TER harian rate; null for the Pasal 17 method (rates are in `breakdown`). */
  rateBp: number | null;
  /** Dasar pengenaan: dailyGross (TER) or 50% of it, floored to whole rupiah (Pasal 17). */
  base: number;
  /** PPh 21 for that one day, whole rupiah (rounded down). */
  tax: number;
}

/**
 * Daily PPh 21 for a Pegawai Tidak Tetap paid other than monthly (PMK 168/2023 Pasal 12 ayat (2),
 * Pasal 16 ayat (2)):
 * - daily gross up to Rp2.500.000 (inclusive): TER harian (PP 58/2023 Lampiran D) x daily gross;
 * - above Rp2.500.000: Pasal 17 ayat (1) huruf a rates x 50% of daily gross. The 50% base is
 *   floored to whole rupiah, then the brackets are applied to it as a standalone amount
 *   (Lampiran B IV.1.3-4: 5% x 50% x Rp3.000.000 = Rp75.000).
 * Monthly-paid Pegawai Tidak Tetap use TER bulanan (Pasal 12 ayat (2) huruf c): call pph21Monthly.
 */
export function pph21Daily({ dailyGross, period }: Pph21DailyInput): Pph21DailyResult {
  assertMoney('dailyGross', dailyGross);
  const date = periodStart(period);
  const rule = ruleAt([terDaily], date, 'TER harian');
  const grossLine = { label: 'Penghasilan bruto sehari', amount: dailyGross, rule: `${PMK168} Pasal 12 ayat (2) huruf a` };
  const band = bandFor(rule.bands, dailyGross);
  if (band) {
    const tax = applyBp(dailyGross, band.rateBp);
    return {
      method: 'TER harian',
      rateBp: band.rateBp,
      base: dailyGross,
      tax,
      breakdown: [
        grossLine,
        { label: `PPh 21 = TER harian ${pct(band.rateBp)} x ${rp(dailyGross)}`, amount: tax, rule: `${cite(rule.source)}; ${PMK168} Pasal 16 ayat (2) huruf a` },
      ],
    };
  }
  const above = rule.aboveTable;
  const base = applyBp(dailyGross, above.baseBp);
  const p17 = ruleAt([pasal17], date, 'Pasal 17');
  const { tax, layers } = progressive(p17.brackets, base);
  return {
    method: 'Pasal 17',
    rateBp: null,
    base,
    tax,
    breakdown: [
      grossLine,
      { label: `Dasar pengenaan = ${pct(above.baseBp)} x ${rp(dailyGross)}`, amount: base, rule: cite(above.source) },
      ...layers.map((l) => ({
        label: `PPh 21 = ${pct(l.rateBp)} x ${rp(l.taxable)}`,
        amount: l.tax,
        rule: `${cite(p17.source)}; ${PMK168} Pasal 16 ayat (2) huruf b`,
      })),
    ],
  };
}
