# Contributing

## Setup

Node >= 22.

```bash
npm install
npm run build      # tsc for both packages
npm test           # vitest
npm run typecheck
```

All three must pass before a commit.

## Updating rules for a new year

Rule values live only in `packages/gajian/src/rules/`. Calculation code reads them by date and has no numbers of its own, so a new rate or cap is a data change plus tests, not a code rewrite.

1. **Add a dated entry; do not edit the old one.** Append a new object with `effectiveFrom: 'YYYY-MM-DD'` (the date the regulation takes effect) to the rule's history array, e.g. a new JP wage cap in `rules/bpjs.ts`. Lookups pick the latest entry with `effectiveFrom <= period`, so older periods keep their old values.
2. **Cite the source with the page.** Fill `source: { regulation, section, url, verification }`. `section` names the article and page (`'Pasal 29 ayat (2) (hlm. 21)'`) so a reader can find the number in the PDF. Use the official document (peraturan.go.id, jdih.kemenkeu.go.id, peraturan.bpk.go.id, pajak.go.id, bpjsketenagakerjaan.go.id). If you can only find the value on a secondary site, set `verification: 'secondary'` and say where it came from in `section`.
3. **Add tests.** In `packages/gajian/test/`: the value before and after the new `effectiveFrom`, and a worked example from the regulation's Lampiran or a hand calculation written out in the test. For rate tables, test every band boundary (just below / at / just above).
4. **Update the docs.** The Sources table in `README.md` and, if limits changed, the "Known limits" in `skills/gajian/SKILL.md`.

Rules come from public regulations only (PP, PMK, UU, Perpres, BPJS letters). Never copy code, tables or values from an employer's, client's or any other proprietary codebase or payroll product.

## Code rules

- Money is integer rupiah; never return floats. Document the rounding of every new function.
- Every result carries `breakdown: { label, amount, rule }[]`.
- The core package (`packages/gajian`) has zero runtime dependencies.
- When you add or move files, update `filemap.md`.

## Commits

Conventional style, short imperative subject: `feat: ...`, `fix(bpjs): ...`, `docs: ...`, `chore: ...`, `test: ...`. For a rule update: `feat(rules): JP wage cap 2026 (BPJS Ketenagakerjaan letter ...)`.
