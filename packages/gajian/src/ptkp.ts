import { ptkp, terCategoryByStatus } from './rules/index.js';
import type { PtkpStatus, TerCategory } from './rules/index.js';
import { assertOneOf, assertYear, cite, rp, ruleAt } from './util.js';
import type { Explained } from './util.js';

export const PTKP_STATUSES = Object.keys(ptkp.amounts) as PtkpStatus[];

export interface PtkpResult extends Explained {
  status: PtkpStatus;
  year: number;
  /** Annual PTKP, integer rupiah. */
  amount: number;
}

/**
 * Annual PTKP for a status in a tax year (rule effective on 1 January of `year`; PMK 168/2023
 * Pasal 9 ayat (4): the status is the one at the start of the calendar year).
 * Throws RangeError for a year before the earliest loaded PTKP rule (2016).
 */
export function getPtkp(status: PtkpStatus, year: number): PtkpResult {
  assertOneOf('status', status, PTKP_STATUSES);
  assertYear(year);
  const rule = ruleAt([ptkp], `${year}-01-01`, 'PTKP');
  const rule_ = cite(rule.source);
  const [kind, n] = status.split('/') as ['TK' | 'K', string];
  const dependents = Number(n);
  const breakdown = [{ label: 'PTKP wajib pajak sendiri', amount: rule.self, rule: rule_ }];
  if (kind === 'K') breakdown.push({ label: 'PTKP tambahan kawin', amount: rule.married, rule: rule_ });
  if (dependents > 0)
    breakdown.push({ label: `PTKP tambahan ${dependents} tanggungan x ${rp(rule.perDependent)}`, amount: dependents * rule.perDependent, rule: rule_ });
  return { status, year, amount: rule.amounts[status], breakdown };
}

/** Monthly TER category (A/B/C) for a PTKP status, PP 58/2023 Pasal 2 ayat (4). */
export function getTerCategory(status: PtkpStatus): TerCategory {
  assertOneOf('status', status, PTKP_STATUSES);
  return terCategoryByStatus.map[status];
}
