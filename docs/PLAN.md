# gajian — PLAN

Status: [ ] todo · [x] accepted. Spec: `docs/SPEC.md`.

1. [ ] **Scaffold** (light). npm workspaces root + `packages/gajian` + `packages/gajian-mcp`, tsconfig (strict, ESM, NodeNext), vitest, `build`/`test`/`typecheck` scripts at root, MIT LICENSE, empty `src/index.ts` exports, one placeholder test per package. Verify: `npm install && npm run build && npm test` green. Depends: none.

2. [ ] **TER tables + rule data** (heavy). Get the Lampiran of PP 58/2023 (TER categories A, B, C) from a primary source (peraturan.go.id / jdih.kemenkeu.go.id / pajak.go.id), transcribe every bracket into `packages/gajian/src/rules/ter.ts` with the source URL. Also write `ptkp.ts`, `pasal17.ts`, `biaya-jabatan.ts`, `bpjs.ts` rule data with citations and effective dates (BPJS JP cap history from at least 2024-03). Verify: a test that checks bracket continuity (no gaps/overlaps, ascending, last bracket open-ended) and spot-checks published DJP examples. Report anything that could not be confirmed from a primary source. Depends: 1.

3. [ ] **Core calculations** (careful). `ptkp.ts`, `ter.ts`, `annual.ts`, `bpjs.ts`, `payslip.ts` per SPEC public API, integer rupiah, `breakdown` on every result. Tests: every TER boundary (just below / at / just above), all 8 PTKP statuses, December reconciliation incl. a refund (lebih bayar) case, BPJS caps before/after a JP cap change, Kesehatan floor. Verify: `npm test`, `npm run typecheck`. Depends: 2.

4. [ ] **MCP server** (medium). `packages/gajian-mcp/src/server.ts` stdio server, tools per SPEC with zod input schemas and descriptions written for agents, `bin: gajian-mcp`. Smoke test spawning the server and calling `tools/list` + `payslip`. Depends: 3.

5. [ ] **Agent Skill** (medium). `skills/gajian/SKILL.md`: when to use, never compute TER from memory, how to call via MCP or via `npx`/library, how to explain a result using `breakdown`, worked examples. Depends: 3.

6. [ ] **README + release prep** (medium). README per SPEC DoD, package.json metadata (keywords: pph21, ter, bpjs, payroll, indonesia, mcp, agent-skills), CONTRIBUTING with "how to update rules for a new year". Depends: 4, 5.
