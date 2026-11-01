import type { Band, Rule } from './types.js';

export interface Pasal17 extends Rule {
  /** Lapisan Penghasilan Kena Pajak (annual PKP), same "sampai dengan" / "di atas" wording as TER. */
  brackets: readonly Band[];
}

/**
 * Pasal 17 ayat (1) huruf a UU PPh as amended by UU 7/2021 (HPP) Pasal 3 angka 7 (PDF hlm. 56);
 * in force from Tahun Pajak 2022 (UU 7/2021 Pasal 17 ayat (1), PDF hlm. 103).
 */
export const pasal17: Pasal17 = {
  effectiveFrom: '2022-01-01',
  source: {
    regulation: 'UU 7/2021 (HPP)',
    section: 'Pasal 3 angka 7: Pasal 17 ayat (1) huruf a UU PPh (hlm. 56); berlaku Tahun Pajak 2022 (Pasal 17 ayat (1), hlm. 103)',
    url: 'https://jdih.kemenkeu.go.id/api/download/a9faab97-aca7-4f87-9fdc-faa8123d1454/7TAHUN2021UU.pdf',
  },
  brackets: [
    { upTo: 60_000_000, rateBp: 500 },
    { upTo: 250_000_000, rateBp: 1500 },
    { upTo: 500_000_000, rateBp: 2500 },
    { upTo: 5_000_000_000, rateBp: 3000 },
    { upTo: null, rateBp: 3500 },
  ],
};
