import { jht, jkk, jkm, jp, jpWageCap, kesehatan } from './rules/index.js';
import type { JkkRiskClass } from './rules/index.js';
import { applyBp, assertMoney, assertOneOf, cite, pct, periodStart, rp, ruleAt } from './util.js';
import type { BreakdownLine, Explained } from './util.js';

export const JKK_CLASSES = Object.keys(jkk.employerBp) as JkkRiskClass[];

export interface BpjsInput {
  /** Monthly upah = upah pokok + tunjangan tetap, integer rupiah (PP 44/2015 Pasal 19 ayat (2); PP 45/2015 Pasal 29 ayat (1)). */
  wage: number;
  /** 'YYYY-MM'. */
  period: string;
  /** JKK tingkat risiko lingkungan kerja (PP 44/2015 Pasal 16 ayat (1)). */
  jkkClass: JkkRiskClass;
  /** BPJS Kesehatan wage floor (UMP/UMK of the region), integer rupiah. Omitted = no floor. */
  kesehatanFloor?: number;
  /** Overrides the JP wage cap from rule data (e.g. a newer BPJS Ketenagakerjaan letter). */
  jpWageCap?: number;
}

export interface Programme {
  base: number;
  employer: number;
  employee: number;
}

export interface BpjsResult extends Explained {
  jht: Programme;
  jkk: Programme;
  jkm: Programme;
  jp: Programme;
  kesehatan: Programme;
  totals: { employer: number; employee: number };
}

/**
 * Monthly BPJS Ketenagakerjaan (JHT, JKK, JKM, JP) and BPJS Kesehatan iuran for a Peserta Penerima Upah.
 * Bases: JHT/JKK/JKM = wage; JP = min(wage, JP wage cap for the period, or `jpWageCap`);
 * Kesehatan = min(max(wage, kesehatanFloor ?? 0), Kesehatan wage cap).
 * Each amount = floor(base x bp / 10000), whole rupiah. Rounding: PP 44/2015, PP 45/2015, PP 46/2015
 * and Perpres 82/2018 (as amended by Perpres 64/2020, 59/2024) state the rates as percentages and
 * set no rounding rule; rounding down keeps every amount at or below the exact percentage.
 * JP cap note: the loaded history has 2015 (Rp7.000.000), 2024-03 and 2025-03 only, so periods from
 * 2016-01 to 2024-02 use the 2015 cap; pass `jpWageCap` for those.
 */
export function bpjs({ wage, period, jkkClass, kesehatanFloor, jpWageCap: capOverride }: BpjsInput): BpjsResult {
  assertMoney('wage', wage);
  assertOneOf('jkkClass', jkkClass, JKK_CLASSES);
  if (kesehatanFloor !== undefined) assertMoney('kesehatanFloor', kesehatanFloor);
  if (capOverride !== undefined) assertMoney('jpWageCap', capOverride);
  const date = periodStart(period);
  const jhtRule = ruleAt([jht], date, 'JHT');
  const jkkRule = ruleAt([jkk], date, 'JKK');
  const jkmRule = ruleAt([jkm], date, 'JKM');
  const jpRule = ruleAt([jp], date, 'JP');
  const capRule = ruleAt(jpWageCap, date, 'JP wage cap');
  const kesRule = ruleAt(kesehatan, date, 'BPJS Kesehatan');

  const breakdown: BreakdownLine[] = [];
  const programme = (name: string, base: number, employerBp: number, employeeBp: number, rule: string): Programme => {
    const p = { base, employer: applyBp(base, employerBp), employee: applyBp(base, employeeBp) };
    breakdown.push({ label: `${name} pemberi kerja ${pct(employerBp)} x ${rp(base)}`, amount: p.employer, rule });
    if (employeeBp > 0) breakdown.push({ label: `${name} pegawai ${pct(employeeBp)} x ${rp(base)}`, amount: p.employee, rule });
    return p;
  };

  const jpCap = capOverride ?? capRule.cap;
  const jpCapRule = capOverride === undefined ? cite(capRule.source) : 'jpWageCap override (caller)';
  const jpBase = Math.min(wage, jpCap);
  const kesBase = Math.min(Math.max(wage, kesehatanFloor ?? 0), kesRule.wageCap);

  const result = {
    jht: programme('JHT', wage, jhtRule.employerBp, jhtRule.employeeBp, cite(jhtRule.source)),
    jkk: programme('JKK', wage, jkkRule.employerBp[jkkClass], 0, cite(jkkRule.source)),
    jkm: programme('JKM', wage, jkmRule.employerBp, jkmRule.employeeBp, cite(jkmRule.source)),
    jp: programme(`JP (upah maks. ${rp(jpCap)})`, jpBase, jpRule.employerBp, jpRule.employeeBp, `${cite(jpRule.source)}; cap: ${jpCapRule}`),
    kesehatan: programme(`BPJS Kesehatan (upah maks. ${rp(kesRule.wageCap)})`, kesBase, kesRule.employerBp, kesRule.employeeBp, cite(kesRule.source)),
  };
  const all = Object.values(result);
  const totals = { employer: all.reduce((s, p) => s + p.employer, 0), employee: all.reduce((s, p) => s + p.employee, 0) };
  const sumRule = `${[...new Set([jhtRule, jkkRule, jkmRule, jpRule, kesRule].map((r) => r.source.regulation))].join(', ')} (jumlah baris di atas)`;
  breakdown.push(
    { label: 'Total iuran BPJS pemberi kerja', amount: totals.employer, rule: sumRule },
    { label: 'Total iuran BPJS pegawai', amount: totals.employee, rule: sumRule },
  );
  return { ...result, totals, breakdown };
}
