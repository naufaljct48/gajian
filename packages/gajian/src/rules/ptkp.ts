import type { Rule } from './types.js';
import type { TerCategory } from './ter.js';

export type PtkpStatus = 'TK/0' | 'TK/1' | 'TK/2' | 'TK/3' | 'K/0' | 'K/1' | 'K/2' | 'K/3';

export interface Ptkp extends Rule {
  /** Pasal 1 huruf a: diri Wajib Pajak. */
  self: number;
  /** Pasal 1 huruf b: tambahan untuk Wajib Pajak yang kawin. */
  married: number;
  /** Pasal 1 huruf d: tambahan per tanggungan, paling banyak 3 orang. */
  perDependent: number;
  maxDependents: number;
  /** Annual PTKP per status = self + (K ? married : 0) + n x perDependent. */
  amounts: Readonly<Record<PtkpStatus, number>>;
}

/**
 * PTKP (annual), PMK 101/PMK.010/2016 Pasal 1 (hlm. 2-3), applies from Tahun Pajak 2016 (Pasal 3).
 * PMK 168/2023 Pasal 9 ayat (1) points to UU PPh Pasal 7 for PTKP; its Lampiran hlm. 63 example
 * uses the same 54.000.000 / 4.500.000 amounts. Pasal 1 huruf c (K/I, wife's income joined) is out
 * of scope: statuses here are the eight TK/K ones.
 */
export const ptkp: Ptkp = {
  effectiveFrom: '2016-01-01',
  source: {
    regulation: 'PMK 101/PMK.010/2016',
    section: 'Pasal 1 huruf a, b, d (hlm. 2-3); Pasal 3',
    url: 'https://jdih.kemenkeu.go.id/api/download/d8072adc-8f62-48d1-95e0-7d25c92b6362/101~PMK.010~2016Per.pdf',
  },
  self: 54_000_000,
  married: 4_500_000,
  perDependent: 4_500_000,
  maxDependents: 3,
  amounts: {
    'TK/0': 54_000_000,
    'TK/1': 58_500_000,
    'TK/2': 63_000_000,
    'TK/3': 67_500_000,
    'K/0': 58_500_000,
    'K/1': 63_000_000,
    'K/2': 67_500_000,
    'K/3': 72_000_000,
  },
};

export interface TerCategoryMap extends Rule {
  map: Readonly<Record<PtkpStatus, TerCategory>>;
}

/** PTKP status -> monthly TER category, PP 58/2023 Pasal 2 ayat (4) (PDF hlm. 4). */
export const terCategoryByStatus: TerCategoryMap = {
  effectiveFrom: '2024-01-01',
  source: {
    regulation: 'PP 58/2023',
    section: 'Pasal 2 ayat (4) (hlm. 4)',
    url: 'https://jdih.kemenkeu.go.id/download/e47c3fc4-a912-4bf1-bcad-335fee3f71f8/2023pp058.pdf',
  },
  map: {
    'TK/0': 'A', // huruf a angka 1
    'TK/1': 'A', // huruf a angka 2
    'K/0': 'A', // huruf a angka 3
    'TK/2': 'B', // huruf b angka 1
    'TK/3': 'B', // huruf b angka 2
    'K/1': 'B', // huruf b angka 3
    'K/2': 'B', // huruf b angka 4
    'K/3': 'C', // huruf c
  },
};
