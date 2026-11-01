---
name: gajian
description: Indonesian payroll math - PPh 21 (TER bulanan/harian, PP 58/2023, December reconciliation with Pasal 17), PTKP, BPJS Ketenagakerjaan (JHT, JKK, JKM, JP) and BPJS Kesehatan, payslips and take-home pay. Load this whenever a user asks about Indonesian salary or tax on salary - "PPh 21", "pajak gaji", "TER", "tarif efektif", "PTKP", "BPJS", "iuran BPJS", "JHT", "JP", "gaji bersih", "take-home pay", "net salary Indonesia", "slip gaji", "payslip", "potongan gaji", "hitung gaji", "pajak Desember", "lebih bayar PPh 21". Never compute these numbers from memory; call the gajian tools/library. Not covered - THR, pesangon/severance, UMK/UMP lookup.
---

# gajian - Indonesian payroll math

## Core rule

**Never compute TER rates, PTKP, BPJS rates or caps, biaya jabatan or Pasal 17 brackets from memory.** LLMs routinely pick the wrong TER row, use an old JP wage cap, forget that employer JKK/JKM/Kesehatan go into PPh 21 gross, or apply annual Pasal 17 to a monthly salary. Always get the number from `gajian`, then explain it from its `breakdown`. If you cannot call it, say so and do not guess.

## How to call it (in order of preference)

### 1. MCP tools (if a `gajian` server is connected)

Tools: `payslip`, `pph21_monthly`, `pph21_daily`, `pph21_december`, `bpjs_contributions`, `list_rules`. Inputs are the same fields as the library functions below.

Install for Claude Code: `claude mcp add gajian -- npx -y gajian-mcp`. Any other MCP client:

```json
{ "mcpServers": { "gajian": { "command": "npx", "args": ["-y", "gajian-mcp"] } } }
```

### 2. Node (>= 22), one-off

```bash
npx -y -p gajian node --input-type=module -e "import { payslip } from 'gajian'; console.log(JSON.stringify(payslip({ components: [{ label: 'Gaji pokok', amount: 10000000, fixed: true }], status: 'K/1', period: '2025-06', jkkClass: 'sangatRendah' }), null, 2))"
```

If that cannot resolve the import, `npm i gajian` in a temp folder and run a `.mjs` file there with `import { payslip } from 'gajian'`.

### Input shapes (all money = integer rupiah, no decimals, no strings)

- `status` (PTKP): `'TK/0' | 'TK/1' | 'TK/2' | 'TK/3' | 'K/0' | 'K/1' | 'K/2' | 'K/3'` (TK = tidak kawin, K = kawin, number = tanggungan, max 3).
- `jkkClass`: `'sangatRendah' | 'rendah' | 'sedang' | 'tinggi' | 'sangatTinggi'` (0,24% / 0,54% / 0,89% / 1,27% / 1,74%).
- `period`: `'YYYY-MM'`; `year`: number.
- `payslip({ components: [{ label, amount, fixed }], status, period, jkkClass, kesehatanFloor?, jpWageCap? })` - January-November only. `fixed: true` = gaji pokok / tunjangan tetap (counts as BPJS wage); `false` = variable (lembur, bonus, tunjangan tidak tetap).
- `pph21Monthly({ gross, status, period })` - TER bulanan.
- `pph21Daily({ dailyGross, period })` - pegawai tidak tetap paid daily/borongan.
- `pph21December({ annualGross, annualEmployeeJhtJp, status, year, taxWithheldJanNov })`.
- `bpjs({ wage, period, jkkClass, kesehatanFloor?, jpWageCap? })`.
- `getPtkp(status, year)`, `getTerCategory(status)`, `rules` (all loaded rule data with dates and sources).

## Ask before computing - never silently assume

If missing, ask. If the user wants a quick answer, use the default **and say you used it**:

| Input | Ask | Default if user says "just assume" |
|---|---|---|
| PTKP status | Kawin? Berapa tanggungan? | `TK/0` |
| Components | Which are fixed (gaji pokok, tunjangan tetap) vs variable (lembur, bonus, insentif)? | all `fixed: true` |
| JKK class | Jenis pekerjaan / risiko lingkungan kerja? | `sangatRendah` (office work) |
| Period | Bulan dan tahun? | current month |
| Kesehatan floor | UMK/UMP daerah, if salary is near minimum wage | none |
| December | Total bruto Jan-Des, iuran JHT+JP pegawai setahun, PPh 21 dipotong Jan-Nov | - (must ask) |

## What goes into TER `gross`

Monthly penghasilan bruto of a pegawai tetap (PMK 168/2023 Pasal 5 ayat (3)): salary, every allowance, overtime, bonus and other irregular pay, **plus employer-paid JKK, JKM and BPJS Kesehatan**. It **excludes** employer-paid JHT and JP. Employee-paid iuran are **not** subtracted. `payslip` does this for you; with `pph21_monthly` you must build `gross` yourself.

- **January-November**: TER bulanan x gross (`payslip` / `pph21_monthly`).
- **December** (pegawai tetap, worked the whole year here): annual reconciliation with Pasal 17 (`pph21_december`); `payslip` throws for `-12`. For a December slip, call `bpjs_contributions` for the deductions and `pph21_december` for the tax. A negative December result is `overpaid` (lebih bayar) the employer must refund.
- **Daily workers** (pegawai tidak tetap, paid daily/borongan): `pph21_daily`; TER harian up to Rp2.500.000/day, Pasal 17 on 50% above it. Monthly-paid tidak tetap use `pph21_monthly`.

## Presenting the result

- Show the `breakdown` lines in order: label, amount, and the `rule` citation (e.g. "PP 58/2023 Lampiran B"). Do not re-derive numbers yourself.
- Format rupiah the Indonesian way: `Rp10.454.000` (dot thousands, no decimals); percentages with a comma: `1,5%`.
- If the result uses the JP wage cap, mention it comes from a BPJS Ketenagakerjaan letter with `verification: 'secondary'` (see `list_rules`); the user can pass `jpWageCap` if they have a newer letter.
- Use `list_rules` when the user asks which regulation/version a number comes from or for a period outside the loaded rules.

## Known limits (say so when relevant)

Not handled: THR / pesangon (severance) as separate rules, UMK/UMP lookup (caller passes `kesehatanFloor`), part-year employees in December (annualisation and the Rp500.000 x months biaya jabatan cap), higher rate without NPWP, gross-up / tunjangan pajak, zakat via employer, other pension (DPLK) unless added to `annualEmployeeJhtJp`, pensiunan and PNS rules, JP caps for 2016-2023 (pass `jpWageCap`). Periods before 2024-01 throw (TER starts 2024).

## Example 1 - monthly payslip

User: "Gaji pokok 10 juta, K/1, kerja kantoran, Juni 2025. Gaji bersih berapa?"

Call `payslip({ components: [{ label: 'Gaji pokok', amount: 10000000, fixed: true }], status: 'K/1', period: '2025-06', jkkClass: 'sangatRendah' })` and say JKK class `sangatRendah` was assumed for office work.

| Baris | Jumlah | Dasar |
|---|---|---|
| Gaji pokok (tetap, upah BPJS) | Rp10.000.000 | PMK 168/2023 Pasal 5 ayat (3) |
| JKK pemberi kerja (masuk bruto) | Rp24.000 | PP 44/2015 Pasal 16 |
| JKM pemberi kerja (masuk bruto) | Rp30.000 | PP 44/2015 Pasal 18 |
| BPJS Kesehatan pemberi kerja (masuk bruto) | Rp400.000 | Perpres 59/2024 |
| Penghasilan bruto PPh 21 | Rp10.454.000 | PMK 168/2023 Pasal 8 ayat (2) |
| PPh 21 (TER B 1,5%) | Rp156.810 | PP 58/2023 Lampiran B |
| JHT pegawai 2% | Rp200.000 | PP 46/2015 Pasal 16 |
| JP pegawai 1% | Rp100.000 | PP 45/2015 Pasal 28 (cap Rp10.547.400, secondary) |
| BPJS Kesehatan pegawai 1% | Rp100.000 | Perpres 59/2024 |
| **Gaji bersih** | **Rp9.443.190** | |

## Example 2 - December reconciliation

Same employee, same salary all of 2025: bruto setahun 12 x Rp10.454.000, iuran JHT+JP pegawai 12 x Rp300.000, PPh 21 Jan-Nov 11 x Rp156.810.

Call `pph21December({ annualGross: 125448000, annualEmployeeJhtJp: 3600000, status: 'K/1', year: 2025, taxWithheldJanNov: 1724910 })`:

| Baris | Jumlah | Dasar |
|---|---|---|
| Penghasilan bruto setahun | Rp125.448.000 | PMK 168/2023 Pasal 8 ayat (2) |
| Biaya jabatan 5% (maks. Rp6.000.000) | Rp6.000.000 | PMK 168/2023 Pasal 10 ayat (2) |
| Iuran JHT + JP pegawai | Rp3.600.000 | PMK 168/2023 Pasal 10 ayat (1) huruf b |
| Penghasilan neto | Rp115.848.000 | PMK 168/2023 Pasal 8 ayat (5) |
| PTKP K/1 | Rp63.000.000 | PMK 101/PMK.010/2016 |
| PKP (dibulatkan ke ribuan) | Rp52.848.000 | PMK 168/2023 Pasal 8 ayat (3)-(4) |
| PPh 21 setahun (5% x Rp52.848.000) | Rp2.642.400 | UU 7/2021 (HPP), Pasal 17 ayat (1) huruf a |
| Dipotong Januari-November | Rp1.724.910 | PMK 168/2023 Pasal 15 ayat (1) huruf a |
| **PPh 21 Desember** | **Rp917.490** | PMK 168/2023 Pasal 15 ayat (1) huruf b |

December tax is higher than the monthly TER amount: that is normal, TER under-withholds and December settles the year.
