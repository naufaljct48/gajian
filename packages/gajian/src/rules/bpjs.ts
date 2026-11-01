import type { Rule, Source } from './types.js';

/**
 * BPJS contribution rates for Peserta Penerima Upah (employer other than penyelenggara negara).
 * Wage base for Ketenagakerjaan programs = upah pokok + tunjangan tetap
 * (PP 44/2015 Pasal 19 ayat (2); PP 45/2015 Pasal 29 ayat (1)).
 */

const pp44: Source = { regulation: 'PP 44/2015', url: 'https://peraturan.bpk.go.id/Download/28927/PP%20Nomor%2044%20Tahun%202015.pdf' };
const pp45: Source = { regulation: 'PP 45/2015', url: 'https://peraturan.bpk.go.id/Download/28931/PP%20Nomor%2045%20Tahun%202015.pdf' };
const pp46: Source = { regulation: 'PP 46/2015', url: 'https://peraturan.bpk.go.id/Download/28934/PP%20Nomor%2046%20Tahun%202015.pdf' };

export interface Contribution extends Rule {
  employerBp: number;
  employeeBp: number;
}

export type JkkRiskClass = 'sangatRendah' | 'rendah' | 'sedang' | 'tinggi' | 'sangatTinggi';

export interface Jkk extends Rule {
  /** Employer-paid, by tingkat risiko lingkungan kerja. */
  employerBp: Readonly<Record<JkkRiskClass, number>>;
}

/** JHT 5.7%: PP 46/2015 Pasal 16 ayat (1) (hlm. 11); in force 1 Jul 2015 (Pasal 37, hlm. 22). */
export const jht: Contribution = {
  effectiveFrom: '2015-07-01',
  source: { ...pp46, section: 'Pasal 16 ayat (1) (hlm. 11); Pasal 37' },
  employerBp: 370,
  employeeBp: 200,
};

/**
 * JKK: PP 44/2015 Pasal 16 ayat (1) (hlm. 12); in force 1 Jul 2015 (Pasal 63, hlm. 45).
 * For JKP participants PP 49/2023 (Pasal 16A PP 44/2015, hlm. 5-6) and PP 6/2025 (Pasal 11 ayat (5)
 * PP 37/2021, hlm. 3-4) book 0.14% of these rates as JKP iuran ("rekomposisi"), leaving JKK at
 * 0.10/0.40/0.75/1.13/1.60%. That re-labels part of the payment; the employer still pays the rates below.
 */
export const jkk: Jkk = {
  effectiveFrom: '2015-07-01',
  source: { ...pp44, section: 'Pasal 16 ayat (1) huruf a-e (hlm. 12); Pasal 63' },
  employerBp: {
    sangatRendah: 24,
    rendah: 54,
    sedang: 89,
    tinggi: 127,
    sangatTinggi: 174,
  },
};

/**
 * JKM 0.30%, employer-paid: PP 44/2015 Pasal 18 ayat (1) (hlm. 13).
 * PP 49/2023 (Pasal 18A, hlm. 6) re-labelled 0.10% of it as JKP iuran from 6 Oct 2023; PP 6/2025
 * (in force 7 Feb 2025) funds JKP from government + JKK only. Payment total is 0.30% either way.
 */
export const jkm: Contribution = {
  effectiveFrom: '2015-07-01',
  source: { ...pp44, section: 'Pasal 18 ayat (1) (hlm. 13); Pasal 63' },
  employerBp: 30,
  employeeBp: 0,
};

/** JP 3%: PP 45/2015 Pasal 28 ayat (2)-(3) (hlm. 20-21); in force 1 Jul 2015 (hlm. 24). */
export const jp: Contribution = {
  effectiveFrom: '2015-07-01',
  source: { ...pp45, section: 'Pasal 28 ayat (2)-(3) (hlm. 20-21)' },
  employerBp: 200,
  employeeBp: 100,
};

export interface JpWageCap extends Rule {
  /** Batas paling tinggi Upah per bulan for JP iuran. */
  cap: number;
}

/**
 * JP wage cap history, ascending. PP 45/2015 Pasal 29 ayat (3)-(4): BPJS Ketenagakerjaan adjusts it
 * every year by (1 + previous year's GDP growth) and announces it.
 * Only entries confirmed from an official host are listed. Missing (not found on an official host):
 * the 2016-2024 adjustments, the March 2025 cap (Rp10.547.400 per bpjsketenagakerjaan.go.id, effective
 * date not stated there) and any 2026 cap.
 */
export const jpWageCap: readonly JpWageCap[] = [
  {
    effectiveFrom: '2015-07-01',
    source: { ...pp45, section: 'Pasal 29 ayat (2) (hlm. 21)' },
    cap: 7_000_000,
  },
];

export interface Kesehatan extends Contribution {
  /** Batas paling tinggi Gaji atau Upah per bulan. */
  wageCap: number;
  /** Batas paling rendah (minimum wage of the region): text of the rule, the amount comes from the caller. */
  wageFloorRule: string;
}

/** BPJS Kesehatan, Peserta PPU: Perpres 82/2018 Pasal 30 and Pasal 32 as amended. Ascending. */
export const kesehatan: readonly Kesehatan[] = [
  {
    effectiveFrom: '2020-05-06',
    source: {
      regulation: 'Perpres 64/2020',
      section: 'Pasal I angka 3 (Pasal 30 ayat (1), hlm. 3) and angka 5 (Pasal 32, hlm. 3-4); diundangkan 6 Mei 2020 (hlm. 12)',
      url: 'https://peraturan.bpk.go.id/Download/127554/Perpres%20Nomor%2064%20Tahun%202020.pdf',
    },
    employerBp: 400,
    employeeBp: 100,
    wageCap: 12_000_000,
    wageFloorRule:
      'UMK; UMP where the region sets no UMK. Not applied to employers granted a deferral (penangguhan) of the minimum wage.',
  },
  {
    effectiveFrom: '2024-05-08',
    source: {
      regulation: 'Perpres 59/2024',
      section: 'Pasal I angka 7 (Pasal 32, hlm. 11-12); Pasal 30 (rates) unchanged since Perpres 64/2020; diundangkan 8 Mei 2024 (hlm. 33)',
      url: 'https://peraturan.bpk.go.id/Download/344279/Perpres%20Nomor%2059%20Tahun%202024.pdf',
    },
    employerBp: 400,
    employeeBp: 100,
    wageCap: 12_000_000,
    wageFloorRule:
      'UMP; UMK where one is set. Not applied to PPU at usaha mikro dan kecil (their floor awaits an actuarial study, Pasal 32 ayat (5)).',
  },
];
