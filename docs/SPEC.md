# gajian — SPEC

Indonesian payroll math (PPh 21 TER + BPJS) as a typed library, an MCP server, and an Agent Skill, so AI agents stop making up tax numbers.

## Goals
- Correct, cited, versioned Indonesian payroll rules: every number in `rules/` points to the regulation it comes from and the date it takes effect.
- One zero-dependency TypeScript core that anyone (apps, agents, MCP) calls.
- An MCP server so Claude / ChatGPT / Cursor can call the core as tools.
- An Agent Skill (`SKILL.md`) that teaches agents when and how to use it, and to never compute TER from memory.
- Easy yearly updates: a rule change = a new dated data entry + tests, not a code rewrite.

## Non-goals (MVP)
- UMK/UMP database, holidays (use existing APIs like `kresnasatya/api-harilibur`), NPWP/NIK validation, PPh 21 non-pegawai, severance (pesangon), THR. Candidates for later.
- Any storage of people's data. Pure functions only.
- No UI.

## Stack
- Node >= 22, TypeScript 5 (strict), ESM only.
- npm workspaces: `packages/gajian` (core, zero runtime deps), `packages/gajian-mcp` (depends on core + `@modelcontextprotocol/sdk`).
- Tests: `vitest`. Build: `tsc` (no bundler).
- License: MIT.

## Architecture
```
packages/gajian/src/
  rules/        dated rule data with citations (PTKP, TER A/B/C, Pasal 17 brackets, biaya jabatan, BPJS rates + caps)
  ptkp.ts       PTKP by status (TK/0..K/3), TER category mapping (A/B/C)
  ter.ts        monthly TER rate lookup + monthly PPh 21 (Jan–Nov)
  annual.ts     December / annual reconciliation (Pasal 17 progressive, biaya jabatan, iuran pensiun deduction)
  bpjs.ts       BPJS Kesehatan, JHT, JP, JKK (5 risk classes), JKM — employer/employee split, caps by date
  payslip.ts    one call: gross components -> BPJS + PPh 21 + take-home pay, with a line-by-line breakdown
  index.ts      public API
packages/gajian-mcp/src/
  server.ts     stdio MCP server exposing the core as tools
skills/gajian/SKILL.md   Agent Skill
```

### Rule data model
Each rule set is `{ effectiveFrom: 'YYYY-MM-DD', source: { regulation, url? }, ...values }`. Lookups take a `period` (`YYYY-MM`) and pick the latest entry with `effectiveFrom <= period`. Money is integer rupiah (no floats in results); rounding follows DJP practice (tax rounded down to whole rupiah) and is documented per function.

### Public API (core)
- `getPtkp(status, year)`, `getTerCategory(status)`
- `pph21Monthly({ gross, status, period })` → `{ category, rate, tax }`
- `pph21December({ annualGross, annualIuranPensiun, status, year, taxWithheldJanNov })` → full breakdown incl. December tax
- `bpjs({ wage, period, jkkClass, kesehatanFloor? })` → per program `{ employer, employee, base }`
- `payslip({ components, status, period, jkkClass })` → breakdown + take-home pay
Every result includes a `breakdown` array of `{ label, amount, rule }` so agents can explain the number.

### MCP tools
`pph21_monthly`, `pph21_december`, `bpjs_contributions`, `payslip`, `list_rules` (what versions/dates are loaded). Input validated with zod (ships with the MCP SDK). Errors returned as tool errors, never thrown to the client.

## Sources (primary)
- PP 58/2023 (TER tables A/B/C, Lampiran) and PMK 168/2023 (procedure, December reconciliation, biaya jabatan).
- UU HPP 7/2021 (Pasal 17 brackets), PMK 101/2016 (PTKP).
- BPJS: PP 44/45/46 2015 and later amendments, Perpres 64/2020 (Kesehatan cap), yearly JP wage-cap letters.
- Cross-check only (MIT): `open-payroll-data/philippines-payroll-data` (BPJS, PTKP, Pasal 17). Its README says it does not include TER grids — ours must come from PP 58/2023 itself.
- Never copy code from any employer or client codebase. Rules come from public regulations only.

## Definition of done (MVP)
- `npm test` green; every TER bracket boundary tested; at least 3 worked examples per function checked against published DJP examples or hand calculation shown in the test.
- `npm run build` produces `dist/` for both packages.
- MCP server starts with `npx gajian-mcp` and answers a `tools/list` + one `tools/call` in a smoke test.
- SKILL.md works when dropped into `~/.claude/skills/`.
- README (EN + short ID section) with install, examples, the "why" story, and the source table.
