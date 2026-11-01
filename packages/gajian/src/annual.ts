import { biayaJabatan, iuranPensiunDeduction, pasal17 } from './rules/index.js';
import type { PtkpStatus } from './rules/index.js';
import { getPtkp } from './ptkp.js';
import { applyBp, assertMoney, assertYear, cite, pct, progressive, rp, ruleAt } from './util.js';
import type { Explained } from './util.js';

const PMK168 = 'PMK 168/2023';

export interface Pph21DecemberInput {
  /**
   * Penghasilan bruto January-December from this employer, integer rupiah: the sum of the monthly
   * gross as `pph21Monthly` defines it (incl. employer-paid JKK, JKM, BPJS Kesehatan; excl.
   * employer-paid JHT/JP), December included.
   */
  annualGross: number;
  /** Employee-paid JHT + JP iuran for the year (PMK 168/2023 Pasal 10 ayat (1) huruf b). */
  annualEmployeeJhtJp: number;
  status: PtkpStatus;
  year: number;
  /** PPh 21 withheld January-November under TER (`pph21Monthly`). */
  taxWithheldJanNov: number;
}

export interface Pph21DecemberResult extends Explained {
  biayaJabatan: number;
  /** Penghasilan neto setahun (can be below PTKP). */
  netIncome: number;
  ptkp: number;
  /** Penghasilan kena pajak, rounded down to the thousand, never negative. */
  pkp: number;
  /** PPh 21 terutang setahun (Pasal 17 progressive). */
  annualTax: number;
  taxWithheldJanNov: number;
  /** annualTax - taxWithheldJanNov. Negative = lebih bayar (see `overpaid`). */
  decemberTax: number;
  /**
   * Lebih bayar, positive (0 when none). The employer must refund it to the employee with the
   * bukti pemotongan, at the latest by the end of the month after the last Masa Pajak
   * (PMK 168/2023 Pasal 21 ayat (1); Pasal 22 ayat (2)).
   */
  overpaid: number;
}

/**
 * PPh 21 for the last Masa Pajak (December) of a Pegawai Tetap who worked for this employer all
 * year, PMK 168/2023 Pasal 15 ayat (1) huruf b and ayat (2):
 *   neto  = bruto - biaya jabatan (5%, max Rp6.000.000 a year, Pasal 10 ayat (2); 5% floored to
 *           whole rupiah) - employee-paid JHT + JP (Pasal 10 ayat (1) huruf b)
 *   PKP   = neto - PTKP, rounded down to the thousand (Pasal 8 ayat (3)-(4)); 0 if negative
 *   tax   = Pasal 17 ayat (1) huruf a progressive on PKP (each layer floored to whole rupiah)
 *   December tax = tax - PPh 21 withheld January-November.
 *
 * Out of scope (not implemented):
 * - partial-year work: annualisation when the subjective tax obligation starts/ends mid-year
 *   (Pasal 15 ayat (3)), and the biaya jabatan cap of Rp500.000 x months worked when someone joins
 *   or leaves mid-year (Lampiran B I.2, Tuan B/D) — this function always uses the annual cap;
 * - zakat / sumbangan keagamaan wajib paid through the employer (Pasal 10 ayat (1) huruf c);
 * - other iuran pensiun (DPLK etc., Pasal 10 ayat (1) huruf b angka 1 and 3) unless the caller
 *   adds them to `annualEmployeeJhtJp`;
 * - the higher rate for recipients without NPWP;
 * - PPh 21 borne by the employer (gross-up / tunjangan pajak computed here);
 * - Pensiunan (biaya pensiun, Pasal 11) and PNS-specific rules.
 */
export function pph21December(input: Pph21DecemberInput): Pph21DecemberResult {
  const { annualGross, annualEmployeeJhtJp, status, year, taxWithheldJanNov } = input;
  assertMoney('annualGross', annualGross);
  assertMoney('annualEmployeeJhtJp', annualEmployeeJhtJp);
  assertMoney('taxWithheldJanNov', taxWithheldJanNov);
  assertYear(year);
  const ptkpResult = getPtkp(status, year);
  const date = `${year}-12-01`;
  const bj = ruleAt([biayaJabatan], date, 'biaya jabatan');
  const iuran = ruleAt([iuranPensiunDeduction], date, 'iuran pensiun deduction');
  const p17 = ruleAt([pasal17], date, 'Pasal 17');

  const biaya = Math.min(applyBp(annualGross, bj.rateBp), bj.maxAnnual);
  const netIncome = annualGross - biaya - annualEmployeeJhtJp;
  const pkp = Math.max(0, Math.floor((netIncome - ptkpResult.amount) / 1000) * 1000);

  // PKP is a multiple of 1000, so every layer's tax is already a whole rupiah.
  const { tax: annualTax, layers } = progressive(p17.brackets, pkp);
  const decemberTax = annualTax - taxWithheldJanNov;
  const overpaid = Math.max(0, -decemberTax);

  const p17Rule = `${cite(p17.source)}; ${PMK168} Pasal 15 ayat (2)`;
  return {
    biayaJabatan: biaya,
    netIncome,
    ptkp: ptkpResult.amount,
    pkp,
    annualTax,
    taxWithheldJanNov,
    decemberTax,
    overpaid,
    breakdown: [
      { label: 'Penghasilan bruto setahun', amount: annualGross, rule: `${PMK168} Pasal 8 ayat (2) huruf a` },
      { label: `Biaya jabatan ${pct(bj.rateBp)} x ${rp(annualGross)} (maks. ${rp(bj.maxAnnual)})`, amount: biaya, rule: cite(bj.source) },
      { label: `Iuran ${iuran.programs.join(' + ')} dibayar pegawai`, amount: annualEmployeeJhtJp, rule: cite(iuran.source) },
      { label: 'Penghasilan neto setahun', amount: netIncome, rule: `${PMK168} Pasal 8 ayat (5)` },
      ...ptkpResult.breakdown,
      { label: 'Penghasilan kena pajak setahun (dibulatkan ke bawah ke ribuan)', amount: pkp, rule: `${PMK168} Pasal 8 ayat (3)-(4)` },
      ...layers.map((l) => ({ label: `${pct(l.rateBp)} x ${rp(l.taxable)}`, amount: l.tax, rule: p17Rule })),
      { label: 'PPh 21 terutang setahun', amount: annualTax, rule: p17Rule },
      { label: 'PPh 21 dipotong Januari-November', amount: taxWithheldJanNov, rule: `${PMK168} Pasal 15 ayat (1) huruf a` },
      decemberTax >= 0
        ? { label: 'PPh 21 dipotong Desember', amount: decemberTax, rule: `${PMK168} Pasal 15 ayat (1) huruf b` }
        : { label: 'PPh 21 lebih dipotong, wajib dikembalikan ke pegawai', amount: overpaid, rule: `${PMK168} Pasal 15 ayat (1) huruf b; Pasal 21 ayat (1)` },
    ],
  };
}
