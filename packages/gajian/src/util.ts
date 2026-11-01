// Internal helpers shared by the calculation modules. Not part of the public API.
import type { Band, Rule, Source } from './rules/index.js';

/** One explained line of a result. `rule` cites regulation + article. */
export interface BreakdownLine {
  label: string;
  amount: number;
  rule: string;
}

/** Every public result carries one. */
export interface Explained {
  breakdown: BreakdownLine[];
}

export const cite = (s: Source): string => (s.section ? `${s.regulation} ${s.section}` : s.regulation);

/** Integer rupiah, >= 0, safe integer. */
export function assertMoney(name: string, v: unknown): asserts v is number {
  if (typeof v !== 'number') throw new TypeError(`${name} must be a number (integer rupiah), got ${typeof v}`);
  if (!Number.isSafeInteger(v) || v < 0) throw new RangeError(`${name} must be a non-negative safe integer (rupiah), got ${v}`);
}

/** 'YYYY-MM' -> 'YYYY-MM-01' (first day of the period, used for rule lookup). */
export function periodStart(period: unknown): string {
  if (typeof period !== 'string') throw new TypeError(`period must be a 'YYYY-MM' string, got ${typeof period}`);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new RangeError(`period must be 'YYYY-MM', got '${period}'`);
  return `${period}-01`;
}

export function assertYear(year: unknown): asserts year is number {
  if (typeof year !== 'number') throw new TypeError(`year must be a number, got ${typeof year}`);
  if (!Number.isInteger(year) || year < 1000 || year > 9999) throw new RangeError(`year must be a 4-digit integer, got ${year}`);
}

export function assertOneOf<T extends string>(name: string, v: unknown, allowed: readonly T[]): asserts v is T {
  if (typeof v !== 'string') throw new TypeError(`${name} must be a string, got ${typeof v}`);
  if (!(allowed as readonly string[]).includes(v)) throw new RangeError(`${name} must be one of ${allowed.join(', ')}; got '${v}'`);
}

/** Latest entry with effectiveFrom <= date ('YYYY-MM-DD'). Throws when none applies. */
export function ruleAt<T extends Rule>(history: readonly T[], date: string, what: string): T {
  let found: T | undefined;
  for (const r of history) if (r.effectiveFrom <= date && (!found || r.effectiveFrom > found.effectiveFrom)) found = r;
  if (!found) {
    const first = history.map((r) => r.effectiveFrom).sort()[0];
    throw new RangeError(`no ${what} rule applies on ${date}; the earliest loaded rule starts ${first}`);
  }
  return found;
}

/** floor(amount x bp / 10000), exact for any safe-integer input (BigInt avoids float error). */
export const applyBp = (amount: number, bp: number): number => Number((BigInt(amount) * BigInt(bp)) / 10000n);

/** Band whose range holds `amount` ("sampai dengan" = inclusive top). Undefined above a closed table. */
export const bandFor = (bands: readonly Band[], amount: number): Band | undefined =>
  bands.find((b) => b.upTo === null || amount <= b.upTo);

/** Percent text for labels: 125 -> '1,25%' (Indonesian decimal comma). */
export const pct = (bp: number): string => `${(bp / 100).toString().replace('.', ',')}%`;

/** Rp1.234.567 (labels only). */
export const rp = (n: number): string => `Rp${n.toLocaleString('id-ID')}`;

export interface Layer {
  from: number;
  upTo: number | null;
  rateBp: number;
  taxable: number;
  tax: number;
}

/**
 * Progressive tax over `brackets` (Pasal 17 ayat (1) huruf a). Each layer's tax is floored to whole
 * rupiah and the total is the sum of the layers, as the PMK 168/2023 Lampiran prints them.
 */
export function progressive(brackets: readonly Band[], base: number): { tax: number; layers: Layer[] } {
  const layers: Layer[] = [];
  let from = 0;
  for (const b of brackets) {
    if (base <= from) break;
    const top = b.upTo === null ? base : Math.min(base, b.upTo);
    const taxable = top - from;
    layers.push({ from, upTo: b.upTo, rateBp: b.rateBp, taxable, tax: applyBp(taxable, b.rateBp) });
    if (b.upTo === null) break;
    from = b.upTo;
  }
  return { tax: layers.reduce((s, l) => s + l.tax, 0), layers };
}
