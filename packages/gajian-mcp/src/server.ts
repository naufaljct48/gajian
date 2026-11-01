#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { JKK_CLASSES, PTKP_STATUSES, bpjs, payslip, pph21Daily, pph21December, pph21Monthly, rules } from 'gajian';
import type { JkkRiskClass, PtkpStatus } from 'gajian';

// src/ and dist/ both sit one level below the package root.
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

const rupiah = (what: string) => z.number().int().nonnegative().describe(`${what}, integer rupiah (no decimals, no thousands separators)`);
const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'period must be YYYY-MM').describe("Masa pajak, 'YYYY-MM'");
const status = z
  .enum(PTKP_STATUSES as [PtkpStatus, ...PtkpStatus[]])
  .describe('PTKP status at the start of the year: TK = not married, K = married; /N = number of dependents (0-3)');
const jkkClass = z
  .enum(JKK_CLASSES as [JkkRiskClass, ...JkkRiskClass[]])
  .describe('JKK tingkat risiko lingkungan kerja (PP 44/2015 Pasal 16 ayat (1)); offices are usually sangatRendah');
const kesehatanFloor = z.number().int().nonnegative().optional().describe('BPJS Kesehatan wage floor (UMP/UMK of the region), integer rupiah. Omit for no floor.');
const jpWageCap = z.number().int().nonnegative().optional().describe('Overrides the loaded JP wage cap, integer rupiah (e.g. a newer BPJS Ketenagakerjaan letter). Omit to use the rule data.');

const COMMON =
  ' All amounts are integer rupiah. The result carries `breakdown`: a list of { label, amount, rule } where `rule` is the legal citation (PP/PMK/UU article); show these lines to the user so they can check the calculation. Always use this tool: never compute TER rates, PTKP or BPJS amounts from memory.';

function ok(result: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result as Record<string, unknown> };
}

// Core throws TypeError/RangeError on bad input; return them as tool errors, never crash.
function run<A>(fn: (args: A) => unknown) {
  return async (args: A): Promise<CallToolResult> => {
    try {
      return ok(fn(args));
    } catch (e) {
      return { isError: true, content: [{ type: 'text', text: e instanceof Error ? e.message : String(e) }] };
    }
  };
}

function loadedRules() {
  return Object.entries(rules).flatMap(([name, value]) =>
    (Array.isArray(value) ? value : [value])
      .filter((r): r is rules.Rule => typeof r === 'object' && r !== null && 'effectiveFrom' in r)
      .map((r) => ({
        name,
        effectiveFrom: r.effectiveFrom,
        regulation: r.source.regulation,
        verification: r.source.verification ?? 'primary',
      })),
  );
}

export function createServer(): McpServer {
  const server = new McpServer({ name: 'gajian', version });

  server.registerTool(
    'pph21_monthly',
    {
      title: 'PPh 21 bulanan (TER)',
      description:
        "Monthly Indonesian PPh 21 for a Pegawai Tetap (Jan-Nov) or a monthly-paid Pegawai Tidak Tetap, using TER bulanan (PP 58/2023) x gross (PMK 168/2023). Returns TER category (A/B/C), rate in basis points and tax (rounded down). `gross` is the FULL monthly penghasilan bruto: salary, every allowance, overtime, bonus/THR and other irregular pay, PLUS the employer-paid BPJS JKK, JKM and BPJS Kesehatan iuran; it EXCLUDES employer-paid JHT and JP; employee-paid iuran are NOT subtracted. For a Pegawai Tetap's December use pph21_december; for a full payslip from pay components use payslip." +
        COMMON,
      inputSchema: { gross: rupiah('Penghasilan bruto sebulan (see description for what it includes)'), status, period },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    run(pph21Monthly),
  );

  server.registerTool(
    'pph21_daily',
    {
      title: 'PPh 21 harian',
      description:
        'Daily PPh 21 for a Pegawai Tidak Tetap paid other than monthly (PMK 168/2023 Pasal 12 ayat (2), Pasal 16 ayat (2)). Daily gross up to Rp2.500.000: TER harian (PP 58/2023 Lampiran D); above it: Pasal 17 rates on 50% of daily gross. `dailyGross` is the day\'s pay, or for upah borongan/satuan the average per day worked (total / days; divide before calling). Returns method, rate, base and tax for that one day (rounded down). Monthly-paid Pegawai Tidak Tetap: use pph21_monthly.' +
        COMMON,
      inputSchema: { dailyGross: rupiah('Penghasilan bruto sehari'), period },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    run(pph21Daily),
  );

  server.registerTool(
    'pph21_december',
    {
      title: 'PPh 21 Desember (rekonsiliasi tahunan)',
      description:
        "PPh 21 for December (last Masa Pajak) of a Pegawai Tetap who worked for this employer all year (PMK 168/2023 Pasal 15): bruto - biaya jabatan (5%, max Rp6.000.000) - employee JHT+JP = neto; neto - PTKP rounded down to the thousand = PKP; Pasal 17 progressive tax on PKP; December tax = annual tax - PPh 21 withheld Jan-Nov. Negative decemberTax means lebih bayar: `overpaid` must be refunded to the employee. `annualGross` is the sum of the monthly gross Jan-Dec as pph21_monthly defines it (incl. employer-paid JKK, JKM, BPJS Kesehatan; excl. employer-paid JHT/JP). Not covered: partial-year work (joined/left mid-year), zakat, no-NPWP surcharge, gross-up, pensioners." +
        COMMON,
      inputSchema: {
        annualGross: rupiah('Penghasilan bruto January-December from this employer'),
        annualEmployeeJhtJp: rupiah('Employee-paid JHT + JP iuran for the year'),
        status,
        year: z.number().int().describe('Tax year, e.g. 2025'),
        taxWithheldJanNov: rupiah('PPh 21 withheld January-November under TER'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    run(pph21December),
  );

  server.registerTool(
    'bpjs_contributions',
    {
      title: 'Iuran BPJS',
      description:
        'Monthly BPJS Ketenagakerjaan (JHT, JKK, JKM, JP) and BPJS Kesehatan iuran for a Peserta Penerima Upah, split employer/employee, with totals. `wage` = upah pokok + tunjangan tetap (not overtime or irregular pay). JP uses the JP wage cap for the period (or `jpWageCap`); Kesehatan uses min(max(wage, kesehatanFloor), Kesehatan cap). Each amount rounded down to whole rupiah. JP cap history between 2016-01 and 2024-02 is not loaded: pass `jpWageCap` for those periods.' +
        COMMON,
      inputSchema: { wage: rupiah('Monthly upah = upah pokok + tunjangan tetap'), period, jkkClass, kesehatanFloor, jpWageCap },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    run(bpjs),
  );

  server.registerTool(
    'payslip',
    {
      title: 'Slip gaji',
      description:
        "One month's payslip for a Pegawai Tetap, January to November (December errors: use pph21_december). From the pay components it computes: BPJS wage = sum of `fixed` components; BPJS iuran; PPh 21 gross = all components + employer JKK + JKM + BPJS Kesehatan; PPh 21 via TER; takeHome = all components - employee JHT, JP, Kesehatan - PPh 21. Mark gaji pokok and tunjangan tetap as fixed: true; overtime, bonus, THR, variable allowances as fixed: false." +
        COMMON,
      inputSchema: {
        components: z
          .array(
            z.object({
              label: z.string().describe('e.g. "Gaji pokok", "Tunjangan transport", "Lembur"'),
              amount: rupiah('Amount paid this month'),
              fixed: z.boolean().describe('true = gaji pokok or tunjangan tetap (counts toward the BPJS wage)'),
            }),
          )
          .min(1),
        status,
        period: period.describe("Masa pajak 'YYYY-MM', January to November only"),
        jkkClass,
        kesehatanFloor,
        jpWageCap,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    run(payslip),
  );

  server.registerTool(
    'list_rules',
    {
      title: 'Loaded rule sets',
      description:
        "Lists every rule set loaded in this gajian version (TER, PTKP, Pasal 17, biaya jabatan, BPJS) with effectiveFrom date, source regulation and verification ('primary' = read from the regulation itself, 'secondary' = no official primary document found). Use it to tell the user how current the data is and to flag secondary-sourced values.",
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    run(() => ({ version, rules: loadedRules() })),
  );

  return server;
}

// Run over stdio only when executed directly (bin / node dist/server.js), not when imported by tests.
// realpath: npx runs the bin through a symlink.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await createServer().connect(new StdioServerTransport());
}
