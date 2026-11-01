import type { Band, Rule, Source } from './types.js';

/**
 * PPh 21 TER (tarif efektif rata-rata), PP 58/2023 Lampiran.
 *
 * How the Lampiran words the rows (Penghasilan Bruto Bulanan / Harian):
 *   first row:  "sampai dengan RpX"                  -> gross <= X
 *   middle:     "di atas RpX sampai dengan RpY"      -> X < gross <= Y
 *   last row:   "di atas RpZ"                        -> gross > Z
 * Each band stores only its inclusive top (`upTo` = the "sampai dengan" amount); its bottom is the
 * previous band's `upTo` ("di atas"). The last monthly band has `upTo: null`.
 * PMK 168/2023 Lampiran hlm. 49 (Tuan L) applies 0% to a daily gross of exactly Rp450.000, which
 * confirms "sampai dengan" is inclusive.
 *
 * Row comments cite the Lampiran page ("hlm.", as printed; hlm. 1 = page 11 of the JDIH PDF,
 * hlm. N = PDF page N + 10). Every row was read twice from the scan (JDIH copy and the
 * pajak.go.id Lampiran copy) and cross-checked against both PDFs' OCR text layers.
 */

export type TerCategory = 'A' | 'B' | 'C';

const pp58: Source = {
  regulation: 'PP 58/2023',
  url: 'https://jdih.kemenkeu.go.id/download/e47c3fc4-a912-4bf1-bcad-335fee3f71f8/2023pp058.pdf',
};

export interface TerMonthly extends Rule {
  A: readonly Band[];
  B: readonly Band[];
  C: readonly Band[];
}

/** Monthly TER, PP 58/2023 Pasal 2 ayat (5) + Lampiran huruf A-C; in force 1 Jan 2024 (Pasal 5). */
export const terMonthly: TerMonthly = {
  effectiveFrom: '2024-01-01',
  source: { ...pp58, section: 'Pasal 2 ayat (5); Lampiran huruf A (hlm. 1-5), B (hlm. 6-10), C (hlm. 10-14)' },
  // Kategori A: 44 rows, Lampiran hlm. 1-5.
  A: [
    { upTo: 5_400_000, rateBp: 0 }, // hlm. 1
    { upTo: 5_650_000, rateBp: 25 }, // hlm. 1
    { upTo: 5_950_000, rateBp: 50 }, // hlm. 1
    { upTo: 6_300_000, rateBp: 75 }, // hlm. 1
    { upTo: 6_750_000, rateBp: 100 }, // hlm. 1
    { upTo: 7_500_000, rateBp: 125 }, // hlm. 1
    { upTo: 8_550_000, rateBp: 150 }, // hlm. 2
    { upTo: 9_650_000, rateBp: 175 }, // hlm. 2
    { upTo: 10_050_000, rateBp: 200 }, // hlm. 2
    { upTo: 10_350_000, rateBp: 225 }, // hlm. 2
    { upTo: 10_700_000, rateBp: 250 }, // hlm. 2
    { upTo: 11_050_000, rateBp: 300 }, // hlm. 2
    { upTo: 11_600_000, rateBp: 350 }, // hlm. 2
    { upTo: 12_500_000, rateBp: 400 }, // hlm. 2
    { upTo: 13_750_000, rateBp: 500 }, // hlm. 2
    { upTo: 15_100_000, rateBp: 600 }, // hlm. 2
    { upTo: 16_950_000, rateBp: 700 }, // hlm. 3
    { upTo: 19_750_000, rateBp: 800 }, // hlm. 3
    { upTo: 24_150_000, rateBp: 900 }, // hlm. 3
    { upTo: 26_450_000, rateBp: 1000 }, // hlm. 3
    { upTo: 28_000_000, rateBp: 1100 }, // hlm. 3
    { upTo: 30_050_000, rateBp: 1200 }, // hlm. 3
    { upTo: 32_400_000, rateBp: 1300 }, // hlm. 3
    { upTo: 35_400_000, rateBp: 1400 }, // hlm. 3
    { upTo: 39_100_000, rateBp: 1500 }, // hlm. 3
    { upTo: 43_850_000, rateBp: 1600 }, // hlm. 4
    { upTo: 47_800_000, rateBp: 1700 }, // hlm. 4
    { upTo: 51_400_000, rateBp: 1800 }, // hlm. 4
    { upTo: 56_300_000, rateBp: 1900 }, // hlm. 4
    { upTo: 62_200_000, rateBp: 2000 }, // hlm. 4
    { upTo: 68_600_000, rateBp: 2100 }, // hlm. 4
    { upTo: 77_500_000, rateBp: 2200 }, // hlm. 4
    { upTo: 89_000_000, rateBp: 2300 }, // hlm. 4
    { upTo: 103_000_000, rateBp: 2400 }, // hlm. 4
    { upTo: 125_000_000, rateBp: 2500 }, // hlm. 5
    { upTo: 157_000_000, rateBp: 2600 }, // hlm. 5
    { upTo: 206_000_000, rateBp: 2700 }, // hlm. 5
    { upTo: 337_000_000, rateBp: 2800 }, // hlm. 5
    { upTo: 454_000_000, rateBp: 2900 }, // hlm. 5
    { upTo: 550_000_000, rateBp: 3000 }, // hlm. 5
    { upTo: 695_000_000, rateBp: 3100 }, // hlm. 5
    { upTo: 910_000_000, rateBp: 3200 }, // hlm. 5
    { upTo: 1_400_000_000, rateBp: 3300 }, // hlm. 5
    { upTo: null, rateBp: 3400 }, // hlm. 5
  ],
  // Kategori B: 40 rows, Lampiran hlm. 6-10.
  B: [
    { upTo: 6_200_000, rateBp: 0 }, // hlm. 6
    { upTo: 6_500_000, rateBp: 25 }, // hlm. 6
    { upTo: 6_850_000, rateBp: 50 }, // hlm. 6
    { upTo: 7_300_000, rateBp: 75 }, // hlm. 6
    { upTo: 9_200_000, rateBp: 100 }, // hlm. 6
    { upTo: 10_750_000, rateBp: 150 }, // hlm. 6
    { upTo: 11_250_000, rateBp: 200 }, // hlm. 6
    { upTo: 11_600_000, rateBp: 250 }, // hlm. 6
    { upTo: 12_600_000, rateBp: 300 }, // hlm. 6
    { upTo: 13_600_000, rateBp: 400 }, // hlm. 7
    { upTo: 14_950_000, rateBp: 500 }, // hlm. 7
    { upTo: 16_400_000, rateBp: 600 }, // hlm. 7
    { upTo: 18_450_000, rateBp: 700 }, // hlm. 7
    { upTo: 21_850_000, rateBp: 800 }, // hlm. 7
    { upTo: 26_000_000, rateBp: 900 }, // hlm. 7
    { upTo: 27_700_000, rateBp: 1000 }, // hlm. 7
    { upTo: 29_350_000, rateBp: 1100 }, // hlm. 7
    { upTo: 31_450_000, rateBp: 1200 }, // hlm. 7
    { upTo: 33_950_000, rateBp: 1300 }, // hlm. 8
    { upTo: 37_100_000, rateBp: 1400 }, // hlm. 8
    { upTo: 41_100_000, rateBp: 1500 }, // hlm. 8
    { upTo: 45_800_000, rateBp: 1600 }, // hlm. 8
    { upTo: 49_500_000, rateBp: 1700 }, // hlm. 8
    { upTo: 53_800_000, rateBp: 1800 }, // hlm. 8
    { upTo: 58_500_000, rateBp: 1900 }, // hlm. 8
    { upTo: 64_000_000, rateBp: 2000 }, // hlm. 8
    { upTo: 71_000_000, rateBp: 2100 }, // hlm. 8
    { upTo: 80_000_000, rateBp: 2200 }, // hlm. 9
    { upTo: 93_000_000, rateBp: 2300 }, // hlm. 9
    { upTo: 109_000_000, rateBp: 2400 }, // hlm. 9
    { upTo: 129_000_000, rateBp: 2500 }, // hlm. 9
    { upTo: 163_000_000, rateBp: 2600 }, // hlm. 9
    { upTo: 211_000_000, rateBp: 2700 }, // hlm. 9
    { upTo: 374_000_000, rateBp: 2800 }, // hlm. 9
    { upTo: 459_000_000, rateBp: 2900 }, // hlm. 9
    { upTo: 555_000_000, rateBp: 3000 }, // hlm. 9
    { upTo: 704_000_000, rateBp: 3100 }, // hlm. 9
    { upTo: 957_000_000, rateBp: 3200 }, // hlm. 10
    { upTo: 1_405_000_000, rateBp: 3300 }, // hlm. 10
    { upTo: null, rateBp: 3400 }, // hlm. 10
  ],
  // Kategori C: 41 rows, Lampiran hlm. 10-14.
  C: [
    { upTo: 6_600_000, rateBp: 0 }, // hlm. 10
    { upTo: 6_950_000, rateBp: 25 }, // hlm. 10
    { upTo: 7_350_000, rateBp: 50 }, // hlm. 10
    { upTo: 7_800_000, rateBp: 75 }, // hlm. 10
    { upTo: 8_850_000, rateBp: 100 }, // hlm. 10
    { upTo: 9_800_000, rateBp: 125 }, // hlm. 11
    { upTo: 10_950_000, rateBp: 150 }, // hlm. 11
    { upTo: 11_200_000, rateBp: 175 }, // hlm. 11
    { upTo: 12_050_000, rateBp: 200 }, // hlm. 11
    { upTo: 12_950_000, rateBp: 300 }, // hlm. 11
    { upTo: 14_150_000, rateBp: 400 }, // hlm. 11
    { upTo: 15_550_000, rateBp: 500 }, // hlm. 11
    { upTo: 17_050_000, rateBp: 600 }, // hlm. 11
    { upTo: 19_500_000, rateBp: 700 }, // hlm. 11
    { upTo: 22_700_000, rateBp: 800 }, // hlm. 12
    { upTo: 26_600_000, rateBp: 900 }, // hlm. 12
    { upTo: 28_100_000, rateBp: 1000 }, // hlm. 12
    { upTo: 30_100_000, rateBp: 1100 }, // hlm. 12
    { upTo: 32_600_000, rateBp: 1200 }, // hlm. 12
    { upTo: 35_400_000, rateBp: 1300 }, // hlm. 12
    { upTo: 38_900_000, rateBp: 1400 }, // hlm. 12
    { upTo: 43_000_000, rateBp: 1500 }, // hlm. 12
    { upTo: 47_400_000, rateBp: 1600 }, // hlm. 12
    { upTo: 51_200_000, rateBp: 1700 }, // hlm. 13
    { upTo: 55_800_000, rateBp: 1800 }, // hlm. 13
    { upTo: 60_400_000, rateBp: 1900 }, // hlm. 13
    { upTo: 66_700_000, rateBp: 2000 }, // hlm. 13
    { upTo: 74_500_000, rateBp: 2100 }, // hlm. 13
    { upTo: 83_200_000, rateBp: 2200 }, // hlm. 13
    { upTo: 95_600_000, rateBp: 2300 }, // hlm. 13
    { upTo: 110_000_000, rateBp: 2400 }, // hlm. 13
    { upTo: 134_000_000, rateBp: 2500 }, // hlm. 13
    { upTo: 169_000_000, rateBp: 2600 }, // hlm. 14
    { upTo: 221_000_000, rateBp: 2700 }, // hlm. 14
    { upTo: 390_000_000, rateBp: 2800 }, // hlm. 14
    { upTo: 463_000_000, rateBp: 2900 }, // hlm. 14
    { upTo: 561_000_000, rateBp: 3000 }, // hlm. 14
    { upTo: 709_000_000, rateBp: 3100 }, // hlm. 14
    { upTo: 965_000_000, rateBp: 3200 }, // hlm. 14
    { upTo: 1_419_000_000, rateBp: 3300 }, // hlm. 14
    { upTo: null, rateBp: 3400 }, // hlm. 14
  ],
};

export interface TerDaily extends Rule {
  /** Closed table: the regulation lists no row above Rp2.500.000 a day. */
  bands: readonly Band[];
  /**
   * Daily gross above the last band: PPh 21 = Pasal 17 rate x `baseBp` of daily gross
   * (PMK 168/2023 Pasal 12 ayat (2) huruf b; worked example Tuan M, Lampiran hlm. 49-50).
   */
  aboveTable: { baseBp: number; source: Source };
}

/** Daily TER (pegawai tidak tetap), PP 58/2023 Pasal 2 ayat (6) + Lampiran huruf D (hlm. 15). */
export const terDaily: TerDaily = {
  effectiveFrom: '2024-01-01',
  source: { ...pp58, section: 'Pasal 2 ayat (6); Lampiran huruf D (hlm. 15)' },
  bands: [
    { upTo: 450_000, rateBp: 0 }, // hlm. 15
    { upTo: 2_500_000, rateBp: 50 }, // hlm. 15
  ],
  aboveTable: {
    baseBp: 5000,
    source: {
      regulation: 'PMK 168/2023',
      section: 'Pasal 12 ayat (2) huruf b (hlm. 13)',
      url: 'https://jdih.kemenkeu.go.id/api/download/e60a82e0-b218-40f5-9d18-b924aa1e11ce/2023pmkeuangan168.pdf',
    },
  },
};
