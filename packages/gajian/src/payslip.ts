import type { JkkRiskClass, PtkpStatus } from './rules/index.js';
import { bpjs } from './bpjs.js';
import type { BpjsResult } from './bpjs.js';
import { pph21Monthly } from './ter.js';
import type { Pph21MonthlyResult } from './ter.js';
import { assertMoney, periodStart } from './util.js';
import type { BreakdownLine, Explained } from './util.js';

const PMK168 = 'PMK 168/2023';

export interface PayComponent {
  label: string;
  /** Integer rupiah paid to the employee this month. */
  amount: number;
  /** true = gaji pokok or tunjangan tetap: counts toward the BPJS wage. */
  fixed: boolean;
}

export interface PayslipInput {
  components: PayComponent[];
  status: PtkpStatus;
  /** 'YYYY-MM', January to November only. */
  period: string;
  jkkClass: JkkRiskClass;
  kesehatanFloor?: number;
  jpWageCap?: number;
}

export interface PayslipResult extends Explained {
  bpjs: BpjsResult;
  pph21: Pph21MonthlyResult;
  /** TER gross: all components + employer-paid JKK, JKM and BPJS Kesehatan. */
  gross: number;
  /** Sum of components - employee BPJS iuran - PPh 21. */
  takeHome: number;
}

/**
 * One month's payslip for a Pegawai Tetap, January to November:
 *   BPJS wage = sum of `fixed` components (upah pokok + tunjangan tetap) -> `bpjs`
 *   gross     = sum of all components + employer JKK + JKM + BPJS Kesehatan (PMK 168/2023 Pasal 5
 *               ayat (3) huruf d-e; employer JHT/JP excluded, Pasal 7 huruf c) -> `pph21Monthly`
 *   takeHome  = sum of all components - employee JHT, JP, Kesehatan iuran - PPh 21
 * `breakdown` lists, in order: the components, the employer iuran added to gross, the gross, PPh 21,
 * the employee deductions and the take-home pay. All amounts are positive; the label says the role.
 * December throws: its PPh 21 is the annual reconciliation (`pph21December`).
 */
export function payslip({ components, status, period, jkkClass, kesehatanFloor, jpWageCap }: PayslipInput): PayslipResult {
  periodStart(period);
  if (period.endsWith('-12'))
    throw new RangeError(
      'payslip covers January-November only: December PPh 21 for a Pegawai Tetap is the annual reconciliation (PMK 168/2023 Pasal 15 ayat (1) huruf b); use pph21December with the year totals',
    );
  if (!Array.isArray(components) || components.length === 0) throw new TypeError('components must be a non-empty array');
  components.forEach((c, i) => {
    if (typeof c?.label !== 'string') throw new TypeError(`components[${i}].label must be a string`);
    assertMoney(`components[${i}].amount`, c.amount);
    if (typeof c.fixed !== 'boolean') throw new TypeError(`components[${i}].fixed must be a boolean`);
  });

  const sum = (cs: PayComponent[]) => cs.reduce((s, c) => s + c.amount, 0);
  const wage = sum(components.filter((c) => c.fixed));
  const total = sum(components);
  const b = bpjs({ wage, period, jkkClass, kesehatanFloor, jpWageCap });
  const gross = total + b.jkk.employer + b.jkm.employer + b.kesehatan.employer;
  const pph21 = pph21Monthly({ gross, status, period });
  const takeHome = total - b.totals.employee - pph21.tax;

  const ruleOf = (prefix: string) => b.breakdown.find((l) => l.label.startsWith(prefix))!.rule;
  const breakdown: BreakdownLine[] = [
    ...components.map((c) => ({
      label: `${c.label}${c.fixed ? ' (tetap, upah BPJS)' : ''}`,
      amount: c.amount,
      rule: `${PMK168} Pasal 5 ayat (3) huruf a-b`,
    })),
    { label: 'JKK dibayar pemberi kerja (masuk bruto PPh 21)', amount: b.jkk.employer, rule: `${PMK168} Pasal 5 ayat (3) huruf d; ${ruleOf('JKK')}` },
    { label: 'JKM dibayar pemberi kerja (masuk bruto PPh 21)', amount: b.jkm.employer, rule: `${PMK168} Pasal 5 ayat (3) huruf d; ${ruleOf('JKM')}` },
    { label: 'BPJS Kesehatan dibayar pemberi kerja (masuk bruto PPh 21)', amount: b.kesehatan.employer, rule: `${PMK168} Pasal 5 ayat (3) huruf e; ${ruleOf('BPJS Kesehatan')}` },
    { label: 'Penghasilan bruto PPh 21', amount: gross, rule: `${PMK168} Pasal 8 ayat (2) huruf a; Pasal 7 huruf c (JHT/JP pemberi kerja tidak masuk)` },
    { label: 'Potongan PPh 21', amount: pph21.tax, rule: pph21.breakdown.at(-1)!.rule },
    { label: 'Potongan JHT pegawai', amount: b.jht.employee, rule: ruleOf('JHT') },
    { label: 'Potongan JP pegawai', amount: b.jp.employee, rule: ruleOf('JP') },
    { label: 'Potongan BPJS Kesehatan pegawai', amount: b.kesehatan.employee, rule: ruleOf('BPJS Kesehatan') },
    { label: 'Gaji bersih (take-home) = komponen - potongan', amount: takeHome, rule: 'arithmetic: sum of components - deductions above' },
  ];
  return { bpjs: b, pph21, gross, takeHome, breakdown };
}
