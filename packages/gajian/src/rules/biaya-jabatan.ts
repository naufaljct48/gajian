import type { Rule, Source } from './types.js';

const pmk168: Source = {
  regulation: 'PMK 168/2023',
  url: 'https://jdih.kemenkeu.go.id/api/download/e60a82e0-b218-40f5-9d18-b924aa1e11ce/2023pmkeuangan168.pdf',
};

export interface BiayaJabatan extends Rule {
  rateBp: number;
  maxMonthly: number;
  maxAnnual: number;
}

/**
 * Biaya jabatan, PMK 168/2023 Pasal 10 ayat (2) (hlm. 12): 5% of gross, max Rp500.000 a month or
 * Rp6.000.000 a year. PMK 168/2023 Pasal 24 huruf a (hlm. 22) revokes PMK 250/PMK.03/2008, the
 * previous source of this rule; Pasal 25 (hlm. 23): in force 1 Jan 2024.
 */
export const biayaJabatan: BiayaJabatan = {
  effectiveFrom: '2024-01-01',
  source: { ...pmk168, section: 'Pasal 10 ayat (2) (hlm. 12); Pasal 24 huruf a; Pasal 25' },
  rateBp: 500,
  maxMonthly: 500_000,
  maxAnnual: 6_000_000,
};

export interface IuranPensiunDeduction extends Rule {
  /** BPJS Ketenagakerjaan programs whose employee share is deductible. */
  programs: readonly ('JHT' | 'JP')[];
}

/**
 * Employee-paid "iuran terkait program pensiun dan hari tua, yang terkait dengan gaji" paid through
 * the employer to BPJS Ketenagakerjaan is a deduction from gross for Pegawai Tetap:
 * PMK 168/2023 Pasal 10 ayat (1) huruf b angka 2 (hlm. 11-12). Hari tua = JHT, pensiun = JP.
 * No cap is set in the article.
 */
export const iuranPensiunDeduction: IuranPensiunDeduction = {
  effectiveFrom: '2024-01-01',
  source: { ...pmk168, section: 'Pasal 10 ayat (1) huruf b (hlm. 11-12)' },
  programs: ['JHT', 'JP'],
};
