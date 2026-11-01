# gajian

TypeScript 5 strict, ESM, Node >= 22, npm workspaces (`packages/gajian` core, `packages/gajian-mcp`), vitest.

## Commands
- `npm install`
- `npm run build` — tsc for all workspaces
- `npm test` — vitest
- `npm run typecheck`

## Rules
- Money is integer rupiah. Never return floats. Rounding is documented per function.
- Every rule value lives in `packages/gajian/src/rules/` with `effectiveFrom` and a `source` citation. No magic numbers in calculation code.
- Rules come from public regulations only (PP, PMK, UU, BPJS letters). Never copy code or tables from an employer or client codebase.
- Core package has zero runtime dependencies.
- Every result carries a `breakdown` of `{ label, amount, rule }`.
- When adding or moving files, update `filemap.md`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

See `docs/SPEC.md`, `docs/PLAN.md`, `filemap.md`.
